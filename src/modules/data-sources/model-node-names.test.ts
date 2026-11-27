import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readModelNodeNames } from "./model-node-names";

const FIXTURES = join(__dirname, "__fixtures__");

describe("readModelNodeNames", () => {
  it("reads the node names of a project's .glb model", async () => {
    const projects = await mkdtemp(join(tmpdir(), "glb-"));
    await mkdir(join(projects, "tower", "models"), { recursive: true });
    await writeFile(join(projects, "tower", "models", "tower.glb"), await readFile(join(FIXTURES, "models", "two-units.glb")));
    expect(await readModelNodeNames(projects, "tower", "models/tower.glb")).toEqual(["Tower", "Unit_A1", "Unit_B1", "Ground"]);
  });

  it("returns no names for a missing model, a path outside models/ or a broken file", async () => {
    const projects = await mkdtemp(join(tmpdir(), "glb-"));
    await mkdir(join(projects, "tower", "models"), { recursive: true });
    await writeFile(join(projects, "tower", "models", "broken.glb"), "not a model");
    await writeFile(join(projects, "tower", "outside.glb"), "x");
    expect(await readModelNodeNames(projects, "tower", "models/missing.glb")).toEqual([]);
    expect(await readModelNodeNames(projects, "tower", "outside.glb")).toEqual([]);
    expect(await readModelNodeNames(projects, "tower", "models/broken.glb")).toEqual([]);
  });
});
