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
