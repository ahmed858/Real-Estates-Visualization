import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { listProjectImages, readImageSize } from "./index";

const projectsDir = fileURLToPath(new URL("../../../projects", import.meta.url));

function png(width: number, height: number): Buffer {
  const b = Buffer.alloc(33);
  b.writeUInt32BE(0x89504e47, 0);
  b.writeUInt32BE(0x0d0a1a0a, 4);
  b.writeUInt32BE(13, 8);
  b.write("IHDR", 12, "ascii");
  b.writeUInt32BE(width, 16);
  b.writeUInt32BE(height, 20);
  return b;
}

/** SOI, an APP0 segment, a DHT segment (C4, which is not a frame), then SOF2 with the size. */
function jpeg(width: number, height: number): Buffer {
  const app0 = [0xff, 0xe0, 0x00, 0x04, 0x00, 0x00];
  const dht = [0xff, 0xc4, 0x00, 0x04, 0x00, 0x00];
  const sof = [0xff, 0xc2, 0x00, 0x0b, 0x08, height >> 8, height & 0xff, width >> 8, width & 0xff, 0x01, 0x01, 0x11, 0x00];
  return Buffer.from([0xff, 0xd8, ...app0, 0xff, ...dht, ...sof]);
}

function webpVp8x(width: number, height: number): Buffer {
  const b = Buffer.alloc(30);
  b.write("RIFF", 0, "ascii");
  b.write("WEBP", 8, "ascii");
  b.write("VP8X", 12, "ascii");
  b.writeUIntLE(width - 1, 24, 3);
  b.writeUIntLE(height - 1, 27, 3);
  return b;
}

const svg = (attrs: string) => Buffer.from(`<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" ${attrs}><rect/></svg>`);

describe("readImageSize", () => {
  it("reads PNG, JPEG and WebP headers", () => {
    expect(readImageSize(png(1200, 900), ".png")).toEqual({ width: 1200, height: 900 });
    expect(readImageSize(jpeg(1600, 1707), ".JPG")).toEqual({ width: 1600, height: 1707 });
    expect(readImageSize(jpeg(640, 480), ".jpeg")).toEqual({ width: 640, height: 480 });
    expect(readImageSize(webpVp8x(3000, 2000), ".webp")).toEqual({ width: 3000, height: 2000 });
  });

  it("reads SVG width and height, or the viewBox when they are missing or relative", () => {
    expect(readImageSize(svg('width="800" height="568px"'), ".svg")).toEqual({ width: 800, height: 568 });
    expect(readImageSize(svg('viewBox="0 0 920 1340"'), ".svg")).toEqual({ width: 920, height: 1340 });
    expect(readImageSize(svg('width="100%" height="100%" viewBox="0,0,400,300"'), ".svg")).toEqual({ width: 400, height: 300 });
    expect(readImageSize(svg('width="200" viewBox="0 0 400 300"'), ".svg")).toEqual({ width: 200, height: 150 });
  });

  it("gives undefined for unreadable or mismatched files", () => {
    expect(readImageSize(svg('width="10em"'), ".svg")).toBeUndefined();
    expect(readImageSize(Buffer.from("not an image"), ".png")).toBeUndefined();
    expect(readImageSize(png(10, 10), ".jpg")).toBeUndefined();
    expect(readImageSize(png(0, 10), ".png")).toBeUndefined();
    expect(readImageSize(Buffer.from([0xff, 0xd8, 0xff, 0xd9]), ".jpg")).toBeUndefined();
    expect(readImageSize(png(10, 10), ".gif")).toBeUndefined();
  });
});

describe("listProjectImages", () => {
  it("lists the demo images with their sizes, including the photo", async () => {
    const images = await listProjectImages(projectsDir, "demo-residence");
    expect(images).toEqual([
      { path: "images/facade.jpg", width: 1600, height: 1707 },
      { path: "images/floor-plan-ground.svg", width: 1200, height: 900 },
      { path: "images/floor-plan-typical.svg", width: 1200, height: 900 },
      { path: "images/logo.svg", width: 256, height: 256 },
    ]);
  });

  it("skips non-images and unreadable images, and gives nothing for unknown or unsafe slugs", async () => {
    const dir = await mkdtemp(join(tmpdir(), "images-"));
    await mkdir(join(dir, "p", "images", "nested"), { recursive: true });
    await writeFile(join(dir, "p", "images", "plan.png"), png(50, 40));
    await writeFile(join(dir, "p", "images", "broken.png"), "nope");
    await writeFile(join(dir, "p", "images", "notes.txt"), "hello");
    expect(await listProjectImages(dir, "p")).toEqual([{ path: "images/plan.png", width: 50, height: 40 }]);
    expect(await listProjectImages(dir, "missing")).toEqual([]);
    expect(await listProjectImages(dir, "../p")).toEqual([]);
  });
});
