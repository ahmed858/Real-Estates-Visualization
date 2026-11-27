import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseProjectConfig, type ProjectConfig } from "@/modules/schema";
import { serializeProjectConfig } from "../index";

const file = (path: string) => fileURLToPath(new URL(`../../../../${path}`, import.meta.url));

async function load(path: string): Promise<{ text: string; config: ProjectConfig }> {
  const text = await readFile(file(path), "utf8");
  const parsed = parseProjectConfig(JSON.parse(text));
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.errors));
  return { text, config: parsed.value };
}

describe("serializeProjectConfig", () => {
  it.each(["projects/demo-villa/project.json", "projects/demo-residence/project.json"])("exports %s without edits byte for byte", async (path) => {
    const { text, config } = await load(path);
    expect(serializeProjectConfig(config)).toBe(text);
  });

  it("exports a hand-formatted project with the same data", async () => {
    // The test fixture is formatted by hand, so only its data must survive.
    const { text, config } = await load("src/modules/tools/__fixtures__/valid-project/project.json");
    expect(JSON.parse(serializeProjectConfig(config))).toEqual(JSON.parse(text));
  });

  it("leaves out schema defaults but keeps typical floors, the units block and empty hotspot lists", async () => {
    const { config } = await load("projects/demo-villa/project.json");
    // Only the 2D scenes (default type), so no "type" key should be written; the demo's turntable keeps its type.
    const twoD = config.root.children.filter((c) => c.type === "image-2d");
    const edited: ProjectConfig = {
      ...config,
      units: { source: "google-sheet", sheetId: "a".repeat(25), gid: "0", refreshSeconds: 60 },
      root: {
        ...config.root,
        hotspots: config.root.hotspots.filter((h) => !("scene" in h.target) || twoD.some((c) => c.id === (h.target as { scene: string }).scene)),
        children: [
          ...twoD,
          { id: "typical", kind: "floor", type: "image-2d", title: { ar: "متكرر", en: "Typical" }, image: { path: "images/t.png", width: 10, height: 10 }, floors: { from: 2, to: 4, unitCode: "{floor}{suffix}" }, hotspots: [], children: [] },
        ],
      },
    };
    const out = serializeProjectConfig(edited);
    const json = JSON.parse(out);
    expect(Object.keys(json)).toEqual(["schemaVersion", "project", "units", "root"]);
    const typical = json.root.children.at(-1);
    expect(Object.keys(typical)).toEqual(["id", "kind", "title", "image", "floors", "hotspots"]);
    expect(out).not.toContain('"type"');
    // What it writes reads back as the same config.
    const back = parseProjectConfig(json);
    expect(back.ok && back.value).toEqual(edited);
  });

  it("keeps published: false, so the editor never publishes a hidden project by accident", async () => {
    const { config } = await load("projects/demo-villa/project.json");
    const hidden = { ...config, project: { ...config.project, published: false } };
    expect(JSON.parse(serializeProjectConfig(hidden)).project.published).toBe(false);
    expect(JSON.parse(serializeProjectConfig(config)).project).not.toHaveProperty("published");
  });

  it("keeps the project location", async () => {
    const { config } = await load("projects/demo-villa/project.json");
    const location = { lat: 30.0444, lng: 31.2357, address: { ar: "القاهرة الجديدة", en: "New Cairo" } };
    const placed = { ...config, project: { ...config.project, location } };
    expect(JSON.parse(serializeProjectConfig(placed)).project.location).toEqual(location);
  });
  it("keeps premium blocks in schema key order and reads them back", async () => {
    const { config } = await load("projects/demo-villa/project.json");
    const sq: [number, number][] = [[1, 1], [5, 1], [5, 5]];
    const premium: ProjectConfig = {
      ...config,
      root: {
        ...config.root,
        children: [
          ...config.root.children,
          { id: "spin", kind: "building", type: "rotation-360", title: { ar: "دوران", en: "Spin" }, image: { path: "images/p.png", width: 10, height: 10 }, rotation: { frames: "rotations/spin/f{index}.jpg", count: 4, width: 10, height: 10 }, hotspots: [{ id: "u", points: sq, frames: { "2": sq }, target: { scene: config.root.id } }], children: [] },
          { id: "tower-model", kind: "building", type: "model-3d", title: { ar: "نموذج", en: "Model" }, image: { path: "images/p.png", width: 10, height: 10 }, model: { path: "models/m.glb" }, hotspots: [{ id: "u", points: sq, mesh: "Unit_U", target: { scene: config.root.id } }], children: [] },
        ],
      },
    };
    const json = JSON.parse(serializeProjectConfig(premium));
    const [spin, model] = json.root.children.slice(-2);
    expect(Object.keys(spin)).toEqual(["id", "kind", "type", "title", "image", "rotation", "hotspots"]);
    expect(Object.keys(model)).toEqual(["id", "kind", "type", "title", "image", "model", "hotspots"]);
    const back = parseProjectConfig(json);
    expect(back.ok && back.value).toEqual(premium);
  });
});
