// The hand-made demo-residence project (a real building photo with floor
// overlays) must stay valid, since it is the demo shown to prospects.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
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
    for (const floor of root.children) expect(floor.hotspots).toHaveLength(4);
  });
});
