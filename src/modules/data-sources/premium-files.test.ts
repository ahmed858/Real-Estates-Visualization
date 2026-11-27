import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { listProjectModels, listProjectPanoramas, listRotationFolders } from "./index";

const projectsDir = fileURLToPath(new URL("../../../projects", import.meta.url));

function png(width: number, height: number): Buffer {
  const b = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.write("IHDR", 12, "ascii");
  b.writeUInt32BE(width, 16);
  b.writeUInt32BE(height, 20);
  return b;
}

describe("listRotationFolders", () => {
  it("lists the demo turntable with every frame's size", async () => {
    const [turntable, ...rest] = await listRotationFolders(projectsDir, "demo-villa");
    expect(rest).toEqual([]);
    expect(turntable.folder).toBe("rotations/turntable");
    expect(turntable.files.length).toBeGreaterThan(1);
    expect(turntable.files[0]).toEqual({ name: "frame-01.svg", width: expect.any(Number), height: expect.any(Number) });
  });

  it("lists folders sorted, skips non-images, keeps unreadable images without a size", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rotations-"));
    await mkdir(join(dir, "p", "rotations", "b"), { recursive: true });
    await mkdir(join(dir, "p", "rotations", "a"), { recursive: true });
    await writeFile(join(dir, "p", "rotations", "b", "f-2.png"), png(10, 5));
    await writeFile(join(dir, "p", "rotations", "b", "f-1.png"), png(10, 5));
    await writeFile(join(dir, "p", "rotations", "b", "broken.png"), "nope");
    await writeFile(join(dir, "p", "rotations", "b", "notes.txt"), "hi");
    await writeFile(join(dir, "p", "rotations", "loose.png"), png(1, 1));
    expect(await listRotationFolders(dir, "p")).toEqual([
      { folder: "rotations/a", files: [] },
      {
        folder: "rotations/b",
        files: [{ name: "broken.png" }, { name: "f-1.png", width: 10, height: 5 }, { name: "f-2.png", width: 10, height: 5 }],
      },
    ]);
    expect(await listRotationFolders(dir, "missing")).toEqual([]);
    expect(await listRotationFolders(dir, "../p")).toEqual([]);
  });
});

describe("listProjectModels", () => {
  it("lists .glb files in models/ only", async () => {
    const dir = await mkdtemp(join(tmpdir(), "models-"));
    await mkdir(join(dir, "p", "models", "nested"), { recursive: true });
    await writeFile(join(dir, "p", "models", "tower.glb"), "x");
    await writeFile(join(dir, "p", "models", "a.GLB"), "x");
    await writeFile(join(dir, "p", "models", "readme.txt"), "x");
    await writeFile(join(dir, "p", "models", "nested", "deep.glb"), "x");
    expect(await listProjectModels(dir, "p")).toEqual(["models/a.GLB", "models/tower.glb"]);
    expect(await listProjectModels(dir, "demo-none")).toEqual([]);
    expect(await listProjectModels(dir, "Bad Slug")).toEqual([]);
  });
});

describe("listProjectPanoramas", () => {
  it("lists the demo residence panoramas with their sizes", async () => {
    const panoramas = await listProjectPanoramas(projectsDir, "demo-residence");
    expect(panoramas.map((p) => p.path)).toEqual(["panoramas/bedroom-b.jpg", "panoramas/living-a.jpg", "panoramas/rooftop.jpg"]);
    expect(panoramas[0]).toMatchObject({ width: 4096, height: 2048 });
  });

  it("keeps only 2:1 pictures and gives nothing for a project without the folder", async () => {
    const dir = await mkdtemp(join(tmpdir(), "panoramas-"));
    await mkdir(join(dir, "p", "panoramas"), { recursive: true });
    await writeFile(join(dir, "p", "panoramas", "wide.png"), png(2000, 1000));
    await writeFile(join(dir, "p", "panoramas", "square.png"), png(1000, 1000));
    expect(await listProjectPanoramas(dir, "p")).toEqual([{ path: "panoramas/wide.png", width: 2000, height: 1000 }]);
    expect(await listProjectPanoramas(dir, "missing")).toEqual([]);
  });
});
