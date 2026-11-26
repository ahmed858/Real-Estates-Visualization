import { describe, expect, it } from "vitest";
import type { ProjectConfig } from "@/modules/schema";
import { imagePixels, nextHotspotId, toImagePoint } from "../index";

const image = { width: 1000, height: 500 };

describe("toImagePoint", () => {
  it("maps screen pixels to image pixels at any zoom", () => {
    const box = { left: 100, top: 50, width: 500, height: 250 };
    expect(toImagePoint(100, 50, box, image)).toEqual([0, 0]);
    expect(toImagePoint(350, 175, box, image)).toEqual([500, 250]);
    expect(toImagePoint(600, 300, { ...box, width: 2000, height: 1000 }, image)).toEqual([250, 125]);
  });

  it("accounts for letterboxing when the box is taller than the image", () => {
    // Image scaled to 0.5 (500x250) and centred vertically in a 500x450 box: 100 px bands above and below.
    const box = { left: 0, top: 0, width: 500, height: 450 };
    expect(toImagePoint(0, 100, box, image)).toEqual([0, 0]);
    expect(toImagePoint(500, 350, box, image)).toEqual([1000, 500]);
  });

  it("returns undefined while the canvas has no size", () => {
    expect(toImagePoint(1, 1, { left: 0, top: 0, width: 0, height: 0 }, image)).toBeUndefined();
  });
});

describe("imagePixels", () => {
  it("converts a screen distance to image pixels", () => {
    expect(imagePixels(8, { left: 0, top: 0, width: 500, height: 250 }, image)).toBe(16);
    expect(imagePixels(8, { left: 0, top: 0, width: 0, height: 0 }, image)).toBe(8);
  });
});

describe("nextHotspotId", () => {
  const scene = (id: string, hotspotIds: string[], children: unknown[] = []) => ({
    id,
    hotspots: hotspotIds.map((h) => ({ id: h, points: [], target: { unit: h } })),
    children,
  });

  it("picks the first shape-N not used in any scene", () => {
    const config = { root: scene("facade", ["shape-1"], [scene("ground", ["shape-2", "g-01"])]) } as unknown as ProjectConfig;
    expect(nextHotspotId(config)).toBe("shape-3");
    expect(nextHotspotId({ root: scene("facade", []) } as unknown as ProjectConfig)).toBe("shape-1");
  });
});
