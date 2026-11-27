import { describe, expect, it } from "vitest";
import { parseProjectConfig, type ProjectConfigInput, type SceneInput } from "../index";

const square = (s = 100): [number, number][] => [
  [10, 10],
  [10 + s, 10],
  [10 + s, 10 + s],
  [10, 10 + s],
];

const rotation = { frames: "rotations/tower/frame-{index}.jpg", count: 36, width: 1600, height: 900 };

function project(root: SceneInput): ProjectConfigInput {
  return {
    schemaVersion: 1,
    project: {
      slug: "tower",
      name: { ar: "برج", en: "Tower" },
      defaultLocale: "ar",
      currency: "EGP",
      contact: { whatsapp: "+201001234567" },
      branding: { logo: "images/logo.svg", primaryColor: "#1a6b4f", accentColor: "#c89b3c" },
    },
    root,
  };
}

const scene = (extra: Partial<SceneInput>): SceneInput => ({
  id: "tower",
  kind: "building",
  title: { ar: "البرج", en: "Tower" },
  image: { path: "images/poster.jpg", width: 1600, height: 900 },
  ...extra,
});

const unitHotspot = (extra: Record<string, unknown> = {}) => ({ id: "a-101", points: square(), target: { unit: "A-101" }, ...extra });

function errors(root: SceneInput) {
  const result = parseProjectConfig(project(root));
  return result.ok ? [] : result.errors;
}

describe("rotation-360 scenes", () => {
  it("accepts a rotation with per-frame polygons", () => {
    const result = parseProjectConfig(project(scene({ type: "rotation-360", rotation: { ...rotation, start: 10 }, hotspots: [unitHotspot({ frames: { "1": square(), "36": square(50) } })] })));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.root.rotation).toEqual({ ...rotation, start: 10 });
    expect(result.value.root.hotspots[0].frames?.["36"]).toEqual(square(50));
  });

  it("needs the rotation block, and only on its type", () => {
    expect(errors(scene({ type: "rotation-360" }))).toEqual([{ path: "root.rotation", message: expect.stringContaining("needs a rotation block") }]);
    expect(errors(scene({ rotation }))[0]).toMatchObject({ path: "root.rotation", message: expect.stringContaining('not "image-2d"') });
  });

  it("checks the frame pattern, count and start", () => {
    expect(errors(scene({ type: "rotation-360", rotation: { ...rotation, frames: "rotations/frame.jpg" } }))[0].path).toBe("root.rotation.frames");
    expect(errors(scene({ type: "rotation-360", rotation: { ...rotation, count: 1 } }))[0].path).toBe("root.rotation.count");
    expect(errors(scene({ type: "rotation-360", rotation: { ...rotation, count: 361 } }))[0].path).toBe("root.rotation.count");
    expect(errors(scene({ type: "rotation-360", rotation: { ...rotation, start: 37 } }))).toEqual([{ path: "root.rotation.start", message: expect.stringContaining("between 1 and count (36)") }]);
  });

  it("checks frame numbers and points inside the frame", () => {
    expect(errors(scene({ type: "rotation-360", rotation, hotspots: [unitHotspot({ frames: { "0": square() } })] }))[0].path).toBe("root.hotspots[0].frames.0");
    expect(errors(scene({ type: "rotation-360", rotation, hotspots: [unitHotspot({ frames: { "37": square() } })] }))).toEqual([
      { path: "root.hotspots[0].frames.37", message: "frame 37 does not exist (the rotation has 36 frames)" },
    ]);
    expect(errors(scene({ type: "rotation-360", rotation: { ...rotation, width: 50, height: 50 }, hotspots: [unitHotspot({ frames: { "2": square() } })] }))[0]).toMatchObject({
      path: "root.hotspots[0].frames.2[1]",
      message: "point [110, 10] is outside the frame (50x50)",
    });
  });

  it("rejects per-frame polygons on another type", () => {
    expect(errors(scene({ hotspots: [unitHotspot({ frames: { "1": square() } })] }))).toEqual([
      { path: "root.hotspots[0].frames", message: 'frames is only allowed on a scene of type "rotation-360"' },
    ]);
  });
});

describe("model-3d scenes", () => {
  it("accepts a model with mesh hotspots", () => {
    const result = parseProjectConfig(project(scene({ type: "model-3d", model: { path: "models/tower.glb" }, hotspots: [unitHotspot({ mesh: "Unit_A101" })] })));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.root.hotspots[0].mesh).toBe("Unit_A101");
  });

  it("needs a .glb model block, and only on its type", () => {
    expect(errors(scene({ type: "model-3d" }))[0].path).toBe("root.model");
    expect(errors(scene({ type: "model-3d", model: { path: "models/tower.obj" } }))[0]).toMatchObject({ path: "root.model.path", message: expect.stringContaining(".glb") });
    expect(errors(scene({ model: { path: "models/tower.glb" } }))[0].path).toBe("root.model");
  });

  it("rejects a mesh used twice and a mesh on another type", () => {
    const twice = [unitHotspot({ mesh: "M" }), { id: "a-102", points: square(), target: { unit: "A-102" }, mesh: "M" }];
    expect(errors(scene({ type: "model-3d", model: { path: "models/t.glb" }, hotspots: twice }))).toEqual([
      { path: "root.hotspots[1].mesh", message: 'mesh "M" is already used by hotspot "a-101"' },
    ]);
    expect(errors(scene({ hotspots: [unitHotspot({ mesh: "M" })] }))).toEqual([{ path: "root.hotspots[0].mesh", message: 'mesh is only allowed on a scene of type "model-3d"' }]);
  });
});
