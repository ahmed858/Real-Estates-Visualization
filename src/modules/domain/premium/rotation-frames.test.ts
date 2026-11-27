import { describe, expect, it } from "vitest";
import { rotationFramePath, rotationFramePaths } from "../index";

describe("rotationFramePath", () => {
  it("pads the frame number to the digits of count", () => {
    expect(rotationFramePath({ frames: "rotations/tower/frame-{index}.jpg", count: 36 }, 1)).toBe("rotations/tower/frame-01.jpg");
    expect(rotationFramePath({ frames: "rotations/tower/frame-{index}.jpg", count: 120 }, 7)).toBe("rotations/tower/frame-007.jpg");
    expect(rotationFramePath({ frames: "r/{index}.webp", count: 8 }, 8)).toBe("r/8.webp");
  });

  it("replaces every placeholder", () => {
    expect(rotationFramePath({ frames: "r/{index}/f{index}.png", count: 10 }, 3)).toBe("r/03/f03.png");
  });
});

describe("rotationFramePaths", () => {
  it("lists every frame in order", () => {
    expect(rotationFramePaths({ frames: "r/f{index}.jpg", count: 3 })).toEqual(["r/f1.jpg", "r/f2.jpg", "r/f3.jpg"]);
  });
});
