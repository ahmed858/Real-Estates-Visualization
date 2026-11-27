// The hand-made demo-residence project (a real building photo with floor
// overlays) must stay valid, since it is the demo shown to prospects.
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { glbNodeNames } from "@/modules/domain";
import { parseProjectConfig } from "@/modules/schema";
import { errorsOf, validateProject, warningsOf } from "../index";

const dir = join(process.cwd(), "projects", "demo-residence");

describe("projects/demo-residence", () => {
  it("passes the project validator with no errors or warnings", async () => {
    const report = await validateProject(dir);
    expect(errorsOf(report)).toEqual([]);
    expect(warningsOf(report)).toEqual([]);
  });

  it("opens one floor per storey from the photo, top band above the next", async () => {
    const parsed = parseProjectConfig(JSON.parse(await readFile(join(dir, "project.json"), "utf8")));
    if (!parsed.ok) throw new Error(JSON.stringify(parsed.errors));
    const root = parsed.value.root;
    expect(root.image.path).toBe("images/facade.jpg");
    expect(root.hotspots.map((h) => h.target)).toEqual(
      ["floor-5", "floor-4", "floor-3", "floor-2", "floor-1", "ground"].map((scene) => ({ scene })),
    );
    const tops = root.hotspots.map((h) => Math.min(...h.points.map(([, y]) => y)));
    expect([...tops].sort((a, b) => a - b)).toEqual(tops);
    const floors = root.children.filter((c) => c.kind === "floor");
    expect(floors.map((f) => f.id)).toEqual(["ground", "floor-1", "floor-2", "floor-3", "floor-4", "floor-5"]);
    for (const floor of floors) expect(floor.hotspots).toHaveLength(4);
    for (const floor of floors) {
      expect(floor.image.path).toBe(
        floor.id === "ground" ? "images/floor-plan-ground.svg" : "images/floor-plan-typical.svg",
      );
    }
  });

  it("has a 3D building whose floors open the floor scenes, and 360° panoramas, all small enough for phones", async () => {
    const parsed = parseProjectConfig(JSON.parse(await readFile(join(dir, "project.json"), "utf8")));
    if (!parsed.ok) throw new Error(JSON.stringify(parsed.errors));
    const premium = parsed.value.root.children.filter((c) => c.type !== "image-2d");
    expect(premium.map((s) => [s.id, s.type])).toEqual([
      ["building-3d", "model-3d"],
      ["living-a-360", "panorama-360"],
      ["bedroom-b-360", "panorama-360"],
      ["rooftop-360", "panorama-360"],
    ]);
    const model = premium[0];
    const glb = await readFile(join(dir, model.model!.path));
    expect(glb.length).toBeLessThan(1.5 * 1024 * 1024);
    const nodes = glbNodeNames(glb);
    for (const h of model.hotspots) {
      expect(nodes).toContain(h.mesh);
      expect(h.target).toEqual({ scene: h.mesh });
    }
    expect(model.hotspots).toHaveLength(6);
    for (const p of premium.slice(1)) expect((await stat(join(dir, p.panorama!.path))).size).toBeLessThan(1.5 * 1024 * 1024);
  });
});
