import { describe, expect, it } from "vitest";
import { parseProjectConfig, type ProjectConfig, type SceneInput } from "@/modules/schema";
import { buildUnitCode, createSceneTree } from "../index";

const square: [number, number][] = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
];
const scene = (id: string, kind: SceneInput["kind"], rest: Partial<SceneInput> = {}): SceneInput => ({
  id,
  kind,
  title: { ar: id, en: id },
  image: { path: `images/${id}.svg`, width: 100, height: 100 },
  ...rest,
});
const toScene = (id: string) => ({ id: `to-${id}`, points: square, target: { scene: id } });
const toUnit = (code: string) => ({ id: `u-${code.toLowerCase()}`, points: square, target: { unit: code } });

function config(root: SceneInput): ProjectConfig {
  const result = parseProjectConfig({
    schemaVersion: 1,
    project: {
      slug: "test",
      name: { ar: "اختبار", en: "Test" },
      defaultLocale: "ar",
      currency: "EGP",
      contact: { whatsapp: "+201001234567" },
      branding: { logo: "images/logo.svg", primaryColor: "#000000", accentColor: "#ffffff" },
    },
    root,
  });
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

const villa = () =>
  config(
    scene("facade", "facade", {
      hotspots: [toScene("ground"), toScene("first"), toScene("roof")],
      children: [
        scene("ground", "floor", { hotspots: [toUnit("G-01"), toUnit("G-02")] }),
        scene("first", "floor", { hotspots: [toUnit("F-01"), toUnit("F-02")] }),
        scene("roof", "floor", { hotspots: [toUnit("R-01")] }),
      ],
    }),
  );

const tower = () =>
  config(
    scene("tower", "building", {
      hotspots: [toScene("lobby"), toScene("typical"), toScene("penthouse")],
      children: [
        scene("lobby", "floor", { hotspots: [toUnit("G-SHOP")] }),
        scene("typical", "floor", {
          floors: { from: 1, to: 3, unitCode: "{floor}{suffix}" },
          hotspots: [
            { id: "a", points: square, target: { unitSuffix: "A" } },
            { id: "b", points: square, target: { unitSuffix: "B" } },
          ],
        }),
        scene("penthouse", "floor", { hotspots: [toUnit("PH")] }),
      ],
    }),
  );

const compound = () => {
  const building = (n: number) =>
    scene(`building-${n}`, "building", {
      hotspots: [toScene(`b${n}-ground`)],
      children: [
        scene(`b${n}-ground`, "floor", {
          hotspots: [toUnit(`B${n}-01`), toScene(`b${n}-type-a`)],
          children: [scene(`b${n}-type-a`, "unit-plan")],
        }),
      ],
    });
  return config(
    scene("masterplan", "masterplan", {
      hotspots: [toScene("building-1"), toScene("building-2")],
      children: [building(1), building(2)],
    }),
  );
};

const ids = (scenes: readonly { id: string }[]) => scenes.map((s) => s.id);

describe("SceneTree on a villa", () => {
  const tree = createSceneTree(villa());

  it("finds scenes by id and lists them parents first", () => {
    expect(tree.get("first").kind).toBe("floor");
    expect(tree.has("basement")).toBe(false);
    expect(ids(tree.scenes)).toEqual(["facade", "ground", "first", "roof"]);
  });

  it("gives children, parent and breadcrumbs", () => {
    expect(ids(tree.children("facade"))).toEqual(["ground", "first", "roof"]);
    expect(tree.parent("roof")?.id).toBe("facade");
    expect(tree.parent("facade")).toBeUndefined();
    expect(ids(tree.breadcrumbs("roof"))).toEqual(["facade", "roof"]);
    expect(ids(tree.breadcrumbs("facade"))).toEqual(["facade"]);
  });

  it("lists every unit code referenced by hotspots", () => {
    expect(tree.unitCodes()).toEqual(["G-01", "G-02", "F-01", "F-02", "R-01"]);
    expect(tree.placedUnits()[0]).toEqual({ code: "G-01", sceneId: "ground", hotspotId: "u-g-01" });
  });

  it("returns no concrete floors for a normal floor", () => {
    expect(tree.concreteFloors("ground")).toEqual([]);
  });

  it("throws on an unknown scene id", () => {
    expect(() => tree.get("nope")).toThrow('unknown scene "nope"');
    expect(() => tree.breadcrumbs("nope")).toThrow();
  });
});

describe("SceneTree on a tower with a typical floor", () => {
  const tree = createSceneTree(tower());

  it("expands the typical floor into concrete floors with unit codes", () => {
    const floors = tree.concreteFloors("typical");
    expect(floors.map((f) => [f.floor, f.units.map((u) => u.code)])).toEqual([
      [1, ["1A", "1B"]],
      [2, ["2A", "2B"]],
      [3, ["3A", "3B"]],
    ]);
    expect(floors[1].units[0]).toEqual({ code: "2A", sceneId: "typical", hotspotId: "a", floor: 2 });
  });

  it("includes expanded codes in the unit list, in tree order", () => {
    expect(tree.unitCodes()).toEqual(["G-SHOP", "1A", "1B", "2A", "2B", "3A", "3B", "PH"]);
  });
});

describe("SceneTree on a compound with two buildings", () => {
  const tree = createSceneTree(compound());

  it("walks three levels deep", () => {
    expect(ids(tree.breadcrumbs("b2-type-a"))).toEqual(["masterplan", "building-2", "b2-ground", "b2-type-a"]);
    expect(tree.parent("b1-ground")?.id).toBe("building-1");
    expect(ids(tree.children("masterplan"))).toEqual(["building-1", "building-2"]);
  });

  it("collects units from both buildings and ignores scene hotspots", () => {
    expect(tree.unitCodes()).toEqual(["B1-01", "B2-01"]);
  });
});

describe("buildUnitCode", () => {
  it("fills every placeholder", () => {
    expect(buildUnitCode("T1-{floor}{suffix}", 12, "C")).toBe("T1-12C");
    expect(buildUnitCode("{suffix}-{floor}-{floor}", -1, "S")).toBe("S--1--1");
  });
});

describe("createSceneTree", () => {
  it("rejects duplicate scene ids even without schema validation", () => {
    const dup = { ...villa().root, children: [villa().root.children[0], villa().root.children[0]] };
    expect(() => createSceneTree({ root: dup })).toThrow('duplicate scene id "ground"');
  });
});
