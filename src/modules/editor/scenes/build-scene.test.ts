import { describe, expect, it } from "vitest";
import { parseProjectConfig, type ProjectConfig } from "@/modules/schema";
import { buildScene, createEditorState, editorReducer } from "../index";

const title = (en: string) => ({ ar: `عربي ${en}`, en });

function config(): ProjectConfig {
  const parsed = parseProjectConfig({
    schemaVersion: 1,
    project: {
      slug: "demo",
      name: title("Demo"),
      defaultLocale: "en",
      currency: "EGP",
      contact: { whatsapp: "+201001234567" },
      branding: { logo: "images/logo.svg", primaryColor: "#1a6b4f", accentColor: "#c89b3c" },
    },
    root: {
      id: "facade",
      kind: "facade",
      title: title("Facade"),
      image: { path: "images/facade.jpg", width: 1600, height: 1707 },
      children: [{ id: "ground", kind: "floor", title: title("Ground"), image: { path: "images/ground.svg", width: 1200, height: 900 } }],
    },
  });
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.errors));
  return parsed.value;
}

const image = { path: "images/typical.png", width: 1200, height: 900 };
const input = { id: "typical", kind: "floor" as const, titleAr: "الدور المتكرر", titleEn: "Typical floor" };

describe("buildScene", () => {
  it("builds a scene with the image size from the image list", () => {
    const result = buildScene(config(), input, image);
    expect(result).toEqual({
      ok: true,
      scene: { id: "typical", kind: "floor", type: "image-2d", title: { ar: "الدور المتكرر", en: "Typical floor" }, image, hotspots: [], children: [] },
    });
  });

  it("builds a typical floor and the project with it still parses", () => {
    const result = buildScene(config(), { ...input, floors: { from: 2, to: 6, unitCode: " {floor}{suffix} " } }, image);
    if (!result.ok) throw new Error(result.errors.join());
    expect(result.scene.floors).toEqual({ from: 2, to: 6, unitCode: "{floor}{suffix}" });
    const added = editorReducer(createEditorState(config()), { type: "do", command: { type: "add-scene", parentId: "facade", scene: result.scene } });
    expect(added.present.config.root.children.map((c) => c.id)).toEqual(["ground", "typical"]);
    expect(parseProjectConfig(added.present.config).ok).toBe(true);
  });

  it("lists what is wrong with the form", () => {
    const bad = buildScene(config(), { ...input, id: "Bad Id", titleAr: " " }, image);
    expect(bad.ok).toBe(false);
    if (bad.ok) return;
    expect(bad.errors.some((e) => e.startsWith("id:"))).toBe(true);
    expect(bad.errors.some((e) => e.startsWith("title.ar:"))).toBe(true);
  });

  it("refuses a scene id already in the project and bad typical floor ranges", () => {
    expect(buildScene(config(), { ...input, id: "ground" }, image)).toEqual({ ok: false, errors: ['id: another scene already uses "ground"'] });
    const range = buildScene(config(), { ...input, floors: { from: 6, to: 2, unitCode: "{floor}{suffix}" } }, image);
    expect(range.ok === false && range.errors.join()).toContain("floors.to");
    const template = buildScene(config(), { ...input, floors: { from: 2, to: 6, unitCode: "{floor}" } }, image);
    expect(template.ok === false && template.errors.join()).toContain("{suffix}");
    const kind = buildScene(config(), { ...input, kind: "building", floors: { from: 2, to: 6, unitCode: "{floor}{suffix}" } }, image);
    expect(kind.ok === false && kind.errors.join()).toContain("floors");
  });
});

describe("add-scene command", () => {
  it("is refused for an unknown parent or a used scene id, and undo removes the scene", () => {
    const start = createEditorState(config());
    const built = buildScene(config(), input, image);
    if (!built.ok) throw new Error("expected a scene");
    expect(editorReducer(start, { type: "do", command: { type: "add-scene", parentId: "nope", scene: built.scene } })).toBe(start);
    const dup = { ...built.scene, id: "ground" };
    expect(editorReducer(start, { type: "do", command: { type: "add-scene", parentId: "facade", scene: dup } })).toBe(start);
    const added = editorReducer(start, { type: "do", command: { type: "add-scene", parentId: "ground", scene: built.scene } });
    expect(added.present.config.root.children[0].children.map((c) => c.id)).toEqual(["typical"]);
    expect(editorReducer(added, { type: "undo" }).present.config.root.children[0].children).toEqual([]);
  });
});

describe("buildScene for premium scenes", () => {
  const frames = (names: string[], size = { width: 1600, height: 900 }) => ({ folder: "rotations/tower", files: names.map((name) => ({ name, ...size })) });
  const numbered = (n: number, pad: number) => Array.from({ length: n }, (_, i) => `frame-${String(i + 1).padStart(pad, "0")}.jpg`);
  const turntable = { ...input, id: "spin", kind: "facade" as const, titleEn: "360 view" };

  it("builds a rotation-360 scene from a frames folder, with the image as poster", () => {
    const result = buildScene(config(), turntable, image, { type: "rotation-360", folder: frames(numbered(12, 2)) });
    expect(result).toMatchObject({
      ok: true,
      scene: { id: "spin", type: "rotation-360", image, rotation: { frames: "rotations/tower/frame-{index}.jpg", count: 12, width: 1600, height: 900 } },
    });
  });

  it("accepts single-digit names when there are fewer than 10 frames", () => {
    const result = buildScene(config(), turntable, image, { type: "rotation-360", folder: frames(numbered(3, 1)) });
    expect(result).toMatchObject({ ok: true, scene: { rotation: { frames: "rotations/tower/frame-{index}.jpg", count: 3 } } });
  });

  it("refuses gaps in the numbering", () => {
    const names = numbered(12, 2).filter((n) => n !== "frame-05.jpg").concat("frame-13.jpg");
    expect(buildScene(config(), turntable, image, { type: "rotation-360", folder: frames(names) })).toEqual({
      ok: false,
      errors: [expect.stringMatching(/^rotation: rotations\/tower: 12 frames must be numbered 1 to 12 .*missing 5$/)],
    });
  });

  it("refuses padding the viewer would not find, mixed names and unnumbered files", () => {
    expect(buildScene(config(), turntable, image, { type: "rotation-360", folder: frames(numbered(12, 3)) })).toMatchObject({ ok: false, errors: [expect.stringContaining("with 2 digits")] });
    expect(buildScene(config(), turntable, image, { type: "rotation-360", folder: frames(["frame-1.jpg", "shot-2.jpg"]) })).toMatchObject({ ok: false, errors: [expect.stringContaining("every frame must be named frame-<number>.jpg")] });
    expect(buildScene(config(), turntable, image, { type: "rotation-360", folder: frames(["frame-1.jpg", "cover.jpg"]) })).toMatchObject({ ok: false, errors: [expect.stringContaining("not cover.jpg")] });
    expect(buildScene(config(), turntable, image, { type: "rotation-360", folder: frames(["frame-1.jpg"]) })).toMatchObject({ ok: false, errors: [expect.stringContaining("at least 2 frames")] });
  });

  it("refuses frames of mixed sizes or unreadable size", () => {
    const folder = { folder: "rotations/tower", files: [{ name: "frame-1.jpg", width: 1600, height: 900 }, { name: "frame-2.jpg", width: 800, height: 450 }] };
    expect(buildScene(config(), turntable, image, { type: "rotation-360", folder })).toEqual({
      ok: false,
      errors: ["rotation: rotations/tower: every frame must be 1600×900 like frame-1.jpg, not frame-2.jpg (800×450)"],
    });
    const unreadable = { folder: "rotations/tower", files: [{ name: "frame-1.jpg", width: 1600, height: 900 }, { name: "frame-2.jpg" }] };
    expect(buildScene(config(), turntable, image, { type: "rotation-360", folder: unreadable })).toMatchObject({ ok: false, errors: [expect.stringContaining("cannot read the size of frame-2.jpg")] });
  });

  it("asks for a folder when none is picked", () => {
    expect(buildScene(config(), turntable, image, { type: "rotation-360", folder: undefined })).toEqual({ ok: false, errors: [expect.stringContaining("pick a frames folder")] });
  });

  it("builds a model-3d scene from a listed model, and asks for one when none is picked", () => {
    expect(buildScene(config(), turntable, image, { type: "model-3d", modelPath: "models/tower.glb" })).toMatchObject({
      ok: true,
      scene: { type: "model-3d", image, model: { path: "models/tower.glb" } },
    });
    expect(buildScene(config(), turntable, image, { type: "model-3d", modelPath: undefined })).toEqual({ ok: false, errors: [expect.stringContaining("pick a .glb file")] });
    expect(buildScene(config(), turntable, image, { type: "model-3d", modelPath: "images/tower.glb" })).toMatchObject({ ok: false, errors: [expect.stringMatching(/^model\.path: .*models\/ folder/)] });
  });

  it("builds a panorama-360 scene from a listed panorama, and asks for one when none is picked", () => {
    const panorama = { path: "panoramas/roof.jpg", width: 4096, height: 2048 };
    expect(buildScene(config(), turntable, image, { type: "panorama-360", panorama })).toMatchObject({ ok: true, scene: { type: "panorama-360", image, panorama } });
    expect(buildScene(config(), turntable, image, { type: "panorama-360", panorama: undefined })).toEqual({ ok: false, errors: [expect.stringContaining("pick a 2:1 picture")] });
    expect(buildScene(config(), turntable, image, { type: "panorama-360", panorama: { ...panorama, height: 1000 } })).toMatchObject({ ok: false, errors: [expect.stringMatching(/^panorama\.width: .*twice as wide/)] });
  });
});
