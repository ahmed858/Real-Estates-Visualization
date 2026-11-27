import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { glbNodeNames } from "@/modules/domain";
import { parseProjectConfig } from "@/modules/schema";
import { buildDemoVillaProject, errorsOf, validateProject, warningsOf, writeProjectFiles } from "../../index";

const files = buildDemoVillaProject();

describe("buildDemoVillaProject", () => {
  it("contains the config, sheet, logo, facade, one plan per floor, the turntable frames and the 3D model", () => {
    expect([...files.keys()].sort()).toEqual([
      "images/facade.svg",
      "images/floor-first.svg",
      "images/floor-ground.svg",
      "images/floor-roof.svg",
      "images/logo.svg",
      "images/turntable.svg",
      "models/villa.glb",
      "project.json",
      ...Array.from({ length: 24 }, (_, i) => `rotations/turntable/frame-${String(i + 1).padStart(2, "0")}.svg`),
      "units.xlsx",
    ]);
  });

  it("has a valid config: facade → 3 floors → 5 units, plus the turntable and the 3D model", () => {
    const parsed = parseProjectConfig(JSON.parse(files.get("project.json") as string));
    if (!parsed.ok) throw new Error(JSON.stringify(parsed.errors));
    const root = parsed.value.root;
    expect(root.hotspots.map((h) => h.target)).toEqual([{ scene: "ground" }, { scene: "first" }, { scene: "roof" }, { scene: "turntable" }, { scene: "model" }]);
    expect(root.children.map((c) => [c.id, c.hotspots.map((h) => h.target)])).toEqual([
      ["ground", [{ unit: "G-01" }, { unit: "G-02" }]],
      ["first", [{ unit: "F-01" }, { unit: "F-02" }]],
      ["roof", [{ unit: "R-01" }]],
      ["turntable", [{ unit: "G-01" }, { unit: "G-02" }, { unit: "F-01" }, { unit: "F-02" }]],
      ["model", [{ unit: "G-01" }, { unit: "G-02" }, { unit: "F-01" }, { unit: "F-02" }]],
    ]);
    const turntable = root.children[3];
    expect(turntable.type).toBe("rotation-360");
    expect(turntable.rotation).toMatchObject({ frames: "rotations/turntable/frame-{index}.svg", count: 24 });
    for (const h of turntable.hotspots) expect(h.points).toEqual(h.frames?.["1"]);
    const model = root.children[4];
    expect(model).toMatchObject({ type: "model-3d", model: { path: "models/villa.glb" }, image: turntable.image });
    expect(model.hotspots.map((h) => [h.mesh, h.points])).toEqual(turntable.hotspots.map((h) => [(h.target as { unit: string }).unit, h.points]));
  });

  it("writes a small 3D model whose node names match the model scene's meshes", () => {
    const glb = files.get("models/villa.glb") as Buffer;
    expect(glb.length).toBeLessThan(30 * 1024);
    expect(glbNodeNames(glb)).toEqual(["G-01", "G-02", "F-01", "F-02", "stair", "roof"]);
    expect(buildDemoVillaProject().get("models/villa.glb")).toEqual(glb);
  });

  it("uses image sizes that match the SVG files", () => {
    const config = JSON.parse(files.get("project.json") as string);
    for (const scene of [config.root, ...config.root.children]) {
      const svg = files.get(scene.image.path) as string;
      expect(svg).toContain(`width="${scene.image.width}" height="${scene.image.height}"`);
    }
    const { rotation } = config.root.children[3];
    for (let n = 1; n <= rotation.count; n++) {
      const svg = files.get(`rotations/turntable/frame-${String(n).padStart(2, "0")}.svg`) as string;
      expect(svg).toContain(`width="${rotation.width}" height="${rotation.height}"`);
    }
  });

  it("passes the project validator with no errors or warnings, with mixed statuses", async () => {
    const dir = await mkdtemp(join(tmpdir(), "demo-villa-"));
    await writeProjectFiles(dir, files);
    const report = await validateProject(dir);
    expect(errorsOf(report)).toEqual([]);
    expect(warningsOf(report)).toEqual([]);
    const written = await readFile(join(dir, "units.xlsx"));
    expect(written.equals(files.get("units.xlsx") as Buffer)).toBe(true);
  });

  it("is deterministic", () => {
    const again = buildDemoVillaProject();
    for (const [path, content] of files) {
      const other = again.get(path)!;
      expect(Buffer.from(other).equals(Buffer.from(content)), path).toBe(true);
    }
  });
});
