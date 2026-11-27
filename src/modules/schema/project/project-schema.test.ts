import { describe, expect, it } from "vitest";
import { isProjectPublished, parseProjectConfig, type ProjectConfig, type ProjectConfigInput, type SceneInput } from "../index";

const image = (w = 1000, h = 800) => ({ path: "images/plan.svg", width: w, height: h });
const square = (x = 10, y = 10, s = 100): [number, number][] => [
  [x, y],
  [x + s, y],
  [x + s, y + s],
  [x, y + s],
];
const title = (en: string) => ({ ar: `عربي ${en}`, en });

function project(root: SceneInput): ProjectConfigInput {
  return {
    schemaVersion: 1,
    project: {
      slug: "demo-villa",
      name: { ar: "فيلا تجريبية", en: "Demo Villa" },
      defaultLocale: "ar",
      currency: "EGP",
      contact: { whatsapp: "+201001234567" },
      branding: { logo: "images/logo.svg", primaryColor: "#1a6b4f", accentColor: "#c89b3c" },
    },
    root,
  };
}

const minimal = (): ProjectConfigInput =>
  project({ id: "facade", kind: "facade", title: title("Facade"), image: image() });

function expectValid(input: unknown): ProjectConfig {
  const result = parseProjectConfig(input);
  if (!result.ok) throw new Error(JSON.stringify(result.errors, null, 2));
  return result.value;
}

function errorsOf(input: unknown) {
  const result = parseProjectConfig(input);
  if (result.ok) throw new Error("expected the config to be invalid");
  return result.errors;
}

describe("parseProjectConfig: valid projects", () => {
  it("accepts a minimal project and fills defaults", () => {
    const config = expectValid(minimal());
    expect(config.root.type).toBe("image-2d");
    expect(config.root.hotspots).toEqual([]);
    expect(config.root.children).toEqual([]);
  });

  it("accepts a villa: facade -> floors -> units", () => {
    const config = expectValid(
      project({
        id: "facade",
        kind: "facade",
        title: title("Facade"),
        image: image(),
        hotspots: [
          { id: "band-ground", points: square(0, 500), target: { scene: "ground" } },
          { id: "band-first", points: square(0, 300), target: { scene: "first" } },
        ],
        children: [
          {
            id: "ground",
            kind: "floor",
            title: title("Ground floor"),
            image: image(),
            hotspots: [
              { id: "g1", points: square(10, 10), target: { unit: "G-01" } },
              { id: "g2", points: square(200, 10), target: { unit: "G-02" } },
            ],
          },
          {
            id: "first",
            kind: "floor",
            title: title("First floor"),
            image: image(),
            hotspots: [{ id: "f1", points: square(), target: { unit: "F-01" } }],
          },
        ],
      }),
    );
    expect(config.root.children.map((c) => c.id)).toEqual(["ground", "first"]);
  });

  it("accepts a nested compound: masterplan -> buildings -> floors -> unit plan", () => {
    const building = (n: number): SceneInput => ({
      id: `building-${n}`,
      kind: "building",
      title: title(`Building ${n}`),
      image: image(),
      hotspots: [{ id: "floor-1", points: square(), target: { scene: `b${n}-floor-1` } }],
      children: [
        {
          id: `b${n}-floor-1`,
          kind: "floor",
          title: title("Floor 1"),
          image: image(),
          hotspots: [{ id: "u1", points: square(), target: { scene: `b${n}-type-a` } }],
          children: [{ id: `b${n}-type-a`, kind: "unit-plan", title: title("Type A"), image: image() }],
        },
      ],
    });
    const config = expectValid(
      project({
        id: "masterplan",
        kind: "masterplan",
        title: title("Masterplan"),
        image: image(2000, 1500),
        hotspots: [
          { id: "b1", points: square(100, 100), target: { scene: "building-1" } },
          { id: "b2", points: square(400, 100), target: { scene: "building-2" } },
        ],
        children: [building(1), building(2)],
      }),
    );
    expect(config.root.children[1].children[0].children[0].kind).toBe("unit-plan");
  });

  it("accepts a typical floor that serves a range of floors", () => {
    const config = expectValid(
      project({
        id: "tower",
        kind: "building",
        title: title("Tower"),
        image: image(),
        hotspots: [{ id: "typical", points: square(), target: { scene: "typical" } }],
        children: [
          {
            id: "typical",
            kind: "floor",
            title: title("Typical floor"),
            image: image(),
            floors: { from: 2, to: 10, unitCode: "{floor}{suffix}" },
            hotspots: [
              { id: "a", points: square(10, 10), target: { unitSuffix: "A" } },
              { id: "b", points: square(200, 10), target: { unitSuffix: "B" } },
            ],
          },
        ],
      }),
    );
    expect(config.root.children[0].floors).toEqual({ from: 2, to: 10, unitCode: "{floor}{suffix}" });
  });
});

describe("parseProjectConfig: error messages carry path and reason", () => {
  it("reports a missing required field", () => {
    const input = minimal() as { project: Record<string, unknown> };
    delete input.project.currency;
    expect(errorsOf(input)).toEqual([{ path: "project.currency", message: expect.any(String) }]);
  });

  it("reports bad field formats", () => {
    const input = minimal();
    input.project.contact.whatsapp = "01001234567";
    input.project.branding.primaryColor = "green";
    input.project.slug = "Demo Villa";
    const paths = errorsOf(input).map((e) => e.path);
    expect(paths).toEqual(
      expect.arrayContaining(["project.slug", "project.contact.whatsapp", "project.branding.primaryColor"]),
    );
    const whatsapp = errorsOf(input).find((e) => e.path === "project.contact.whatsapp");
    expect(whatsapp?.message).toMatch(/international number/);
  });

  it("accepts a project without a location and keeps a valid one", () => {
    expect(expectValid(minimal()).project.location).toBeUndefined();
    const input = minimal();
    const location = { lat: 30.0444, lng: 31.2357, address: { ar: "التجمع الخامس، القاهرة الجديدة", en: "Fifth Settlement, New Cairo" } };
    input.project.location = location;
    expect(expectValid(input).project.location).toEqual(location);
  });

  it("accepts the edges of the coordinate ranges", () => {
    const input = minimal();
    input.project.location = { lat: -90, lng: 180, address: title("Edge") };
    expect(expectValid(input).project.location).toMatchObject({ lat: -90, lng: 180 });
  });

  it("rejects coordinates out of range, a missing address language and unknown location fields", () => {
    const input = minimal();
    input.project.location = { lat: 91, lng: -181, address: { ar: "القاهرة", en: "" } };
    expect(errorsOf(input).map((e) => e.path)).toEqual(
      expect.arrayContaining(["project.location.lat", "project.location.lng", "project.location.address.en"]),
    );
    expect(errorsOf(input).find((e) => e.path === "project.location.lat")?.message).toMatch(/-90 and 90/);
    const typo = minimal();
    (typo.project as Record<string, unknown>).location = { lat: 30, lon: 31, address: title("Cairo") };
    expect(errorsOf(typo).map((e) => e.path)).toEqual(expect.arrayContaining(["project.location.lng"]));
  });

  it("rejects unknown fields so typos are caught", () => {
    const input = { ...minimal(), extra: true };
    expect(errorsOf(input)[0].path).toBe("(root)");
    expect(errorsOf(input)[0].message).toMatch(/extra/);
  });

  it("rejects a wrong schema version and an unknown scene kind", () => {
    const input = { ...minimal(), schemaVersion: 2 };
    (input.root as { kind: string }).kind = "tower";
    const paths = errorsOf(input).map((e) => e.path);
    expect(paths).toEqual(expect.arrayContaining(["schemaVersion", "root.kind"]));
  });

  it("rejects image paths outside the project folder", () => {
    const input = minimal();
    input.root.image.path = "../other/plan.svg";
    expect(errorsOf(input)).toEqual([{ path: "root.image.path", message: 'must not contain ".." segments' }]);
  });

  it("rejects a polygon with fewer than 3 points, with the nested path", () => {
    const input = project({
      id: "facade",
      kind: "facade",
      title: title("Facade"),
      image: image(),
      children: [
        {
          id: "ground",
          kind: "floor",
          title: title("Ground"),
          image: image(),
          hotspots: [{ id: "g1", points: [[0, 0], [1, 1]], target: { unit: "G-01" } }],
        },
      ],
    });
    expect(errorsOf(input)).toEqual([
      { path: "root.children[0].hotspots[0].points", message: "a polygon needs at least 3 points" },
    ]);
  });

  it("rejects points outside the image bounds", () => {
    const input = project({
      id: "facade",
      kind: "facade",
      title: title("Facade"),
      image: image(100, 100),
      hotspots: [{ id: "h", points: [[0, 0], [150, 0], [50, 50]], target: { unit: "U1" } }],
    });
    expect(errorsOf(input)).toEqual([
      { path: "root.hotspots[0].points[1]", message: "point [150, 0] is outside the image (100x100)" },
    ]);
  });

  it("rejects duplicate scene ids and duplicate hotspot ids", () => {
    const input = project({
      id: "facade",
      kind: "facade",
      title: title("Facade"),
      image: image(),
      hotspots: [
        { id: "h", points: square(), target: { scene: "floor" } },
        { id: "h", points: square(), target: { scene: "floor" } },
      ],
      children: [
        { id: "floor", kind: "floor", title: title("A"), image: image() },
        { id: "floor", kind: "floor", title: title("B"), image: image() },
      ],
    });
    const errors = errorsOf(input);
    expect(errors).toContainEqual({ path: "root.children[1].id", message: 'duplicate scene id "floor" (first used at root.children.0)' });
    expect(errors).toContainEqual({ path: "root.hotspots[1].id", message: 'duplicate hotspot id "h" in scene "facade"' });
  });

  it("rejects hotspots that point at a missing scene or at their own scene", () => {
    const input = project({
      id: "facade",
      kind: "facade",
      title: title("Facade"),
      image: image(),
      hotspots: [
        { id: "a", points: square(), target: { scene: "nowhere" } },
        { id: "b", points: square(), target: { scene: "facade" } },
      ],
    });
    expect(errorsOf(input)).toEqual([
      { path: "root.hotspots[0].target.scene", message: 'scene "nowhere" does not exist' },
      { path: "root.hotspots[1].target.scene", message: 'hotspot "b" points at its own scene' },
    ]);
  });

  it("rejects a hotspot target with both scene and unit", () => {
    const input = project({
      id: "facade",
      kind: "facade",
      title: title("Facade"),
      image: image(),
      hotspots: [{ id: "a", points: square(), target: { scene: "x", unit: "U1" } as never }],
    });
    expect(errorsOf(input)[0].path).toBe("root.hotspots[0].target");
  });

  it("checks typical floor rules", () => {
    const input = project({
      id: "tower",
      kind: "building",
      title: title("Tower"),
      image: image(),
      floors: { from: 1, to: 3, unitCode: "{floor}{suffix}" },
      hotspots: [{ id: "s", points: square(), target: { unitSuffix: "A" } }],
      children: [
        {
          id: "typical",
          kind: "floor",
          title: title("Typical"),
          image: image(),
          floors: { from: 10, to: 2, unitCode: "{floor}{suffix}" },
          hotspots: [{ id: "a", points: square(), target: { unit: "10A" } }],
        },
        {
          id: "plain",
          kind: "floor",
          title: title("Plain"),
          image: image(),
          hotspots: [{ id: "a", points: square(), target: { unitSuffix: "A" } }],
        },
      ],
    });
    const paths = errorsOf(input).map((e) => e.path);
    expect(paths).toEqual([
      "root.floors",
      "root.children[0].floors.to",
      "root.children[0].hotspots[0].target.unit",
      "root.children[1].hotspots[0].target.unitSuffix",
    ]);
  });

  it("requires {floor} and {suffix} in the unit code template", () => {
    const input = project({
      id: "typical",
      kind: "floor",
      title: title("Typical"),
      image: image(),
      floors: { from: 1, to: 2, unitCode: "{floor}" },
    });
    expect(errorsOf(input)).toEqual([
      { path: "root.floors.unitCode", message: "must contain {floor} and {suffix}, e.g. {floor}{suffix}" },
    ]);
  });
});

describe("project.published", () => {
  it("is optional and a project without it is published", () => {
    const config = expectValid(minimal());
    expect(config.project.published).toBeUndefined();
    expect(isProjectPublished(config.project)).toBe(true);
  });

  it("hides the project only when it is false", () => {
    const hidden = minimal();
    (hidden.project as { published?: boolean }).published = false;
    expect(isProjectPublished(expectValid(hidden).project)).toBe(false);
    const shown = minimal();
    (shown.project as { published?: boolean }).published = true;
    expect(isProjectPublished(expectValid(shown).project)).toBe(true);
  });

  it("rejects anything but a boolean", () => {
    const input = minimal();
    (input.project as unknown as { published: unknown }).published = "no";
    expect(errorsOf(input).map((e) => e.path)).toContain("project.published");
  });
});

describe("compound levels", () => {
  it("accepts phase, block and cluster scenes at any depth", () => {
    const scene = (id: string, kind: string, children: unknown[] = []) => ({
      id,
      kind,
      title: { ar: id, en: id },
      image: { path: `images/${id}.jpg`, width: 100, height: 100 },
      hotspots: children.map((c) => ({ id: (c as { id: string }).id, points: [[0, 0], [10, 0], [10, 10]], target: { scene: (c as { id: string }).id } })),
      children,
    });
    const result = parseProjectConfig({
      schemaVersion: 1,
      project: {
        slug: "compound",
        name: { ar: "كمبوند", en: "Compound" },
        defaultLocale: "ar",
        currency: "EGP",
        contact: { whatsapp: "+201001234567" },
        branding: { logo: "images/logo.svg", primaryColor: "#1a6b4f", accentColor: "#c89b3c" },
      },
      root: scene("site", "masterplan", [scene("phase-1", "phase", [scene("block-a", "block", [scene("cluster-1", "cluster")])])]),
    });
    expect(result.ok ? [] : result.errors).toEqual([]);
  });
});
