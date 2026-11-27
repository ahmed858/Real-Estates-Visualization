import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MAX_MODEL_BYTES, MAX_ROTATION_FRAME_BYTES } from "@/modules/domain";
import { readProjectFile } from "./index";

const projectsDir = fileURLToPath(new URL("../../../projects", import.meta.url));

describe("readProjectFile", () => {
  it("serves an SVG image with its content type", async () => {
    const file = await readProjectFile(projectsDir, "demo-villa", ["images", "facade.svg"]);
    expect(file?.contentType).toBe("image/svg+xml");
    expect(file?.body.toString("utf8")).toMatch(/^<svg /);
  });

  it.each([
    [["..", "demo-villa", "project.json"]],
    [["images", "..", "..", "..", "package.json"]],
    [["images", "../../package.json"]],
    [["images", "..\\..\\x.svg"]],
    [["."]],
    [[]],
  ])("rejects unsafe path %j", async (segments) => {
    expect(await readProjectFile(projectsDir, "demo-villa", segments)).toBeNull();
  });

  it.each(["../projects", "Demo-Villa", "missing-project"])("rejects slug %j", async (slug) => {
    expect(await readProjectFile(projectsDir, slug, ["images", "facade.svg"])).toBeNull();
  });

  it.each([["project.json"], ["units.xlsx"], ["README.md"]])("rejects non-image file %j", async (name) => {
    expect(await readProjectFile(projectsDir, "demo-villa", [name])).toBeNull();
  });

  it("returns null for a missing image", async () => {
    expect(await readProjectFile(projectsDir, "demo-villa", ["images", "nope.png"])).toBeNull();
  });
});

describe("readProjectFile with premium assets", () => {
  let dir: string;
  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "premium-files-"));
    const at = async (path: string, bytes: number) => {
      await mkdir(join(dir, "tower", path, ".."), { recursive: true });
      await writeFile(join(dir, "tower", path), Buffer.alloc(bytes));
    };
    await at("rotations/spin/frame-01.jpg", 10);
    await at("rotations/spin/frame-02.jpg", MAX_ROTATION_FRAME_BYTES + 1);
    await at("models/tower.glb", 20);
    await at("images/tower.glb", 20);
    await at("models/huge.glb", MAX_MODEL_BYTES + 1);
    await at("images/big.jpg", MAX_ROTATION_FRAME_BYTES + 1);
  });
  afterAll(() => rm(dir, { recursive: true, force: true }));

  it("serves rotation frames within the limit", async () => {
    expect((await readProjectFile(dir, "tower", ["rotations", "spin", "frame-01.jpg"]))?.contentType).toBe("image/jpeg");
    expect(await readProjectFile(dir, "tower", ["rotations", "spin", "frame-02.jpg"])).toBeNull();
  });

  it("serves .glb models from models/ only, within the limit", async () => {
    const model = await readProjectFile(dir, "tower", ["models", "tower.glb"]);
    expect(model?.contentType).toBe("model/gltf-binary");
    expect(model?.body.length).toBe(20);
    expect(await readProjectFile(dir, "tower", ["images", "tower.glb"])).toBeNull();
    expect(await readProjectFile(dir, "tower", ["models", "huge.glb"])).toBeNull();
  });

  it("keeps plain images without a limit", async () => {
    expect((await readProjectFile(dir, "tower", ["images", "big.jpg"]))?.body.length).toBe(MAX_ROTATION_FRAME_BYTES + 1);
  });
});
