import { describe, expect, it } from "vitest";
import type { Scene } from "@/modules/schema";
import { initialFrame, sceneOnFrame, withFrame, wrapFrame } from "../index";
import { fileBaseFrom } from "./rotation-frame";

const rotation = { frames: "rotations/spin/f-{index}.jpg", count: 12, width: 800, height: 600 };
const sq = (x: number): [number, number][] => [[x, 0], [x + 10, 0], [x + 10, 10]];

describe("wrapFrame", () => {
  it("wraps around both ends", () => {
    expect(wrapFrame(1, 12)).toBe(1);
    expect(wrapFrame(13, 12)).toBe(1);
    expect(wrapFrame(0, 12)).toBe(12);
    expect(wrapFrame(-12, 12)).toBe(12);
    expect(wrapFrame(26, 12)).toBe(2);
  });
});

describe("initialFrame", () => {
  it("takes a valid ?frame=, else start, else 1", () => {
    expect(initialFrame(rotation, "?frame=5&unit=A")).toBe(5);
    expect(initialFrame({ ...rotation, start: 3 }, "?frame=13")).toBe(3);
    expect(initialFrame({ ...rotation, start: 3 }, "?frame=2x")).toBe(3);
    expect(initialFrame(rotation, "")).toBe(1);
  });
});

describe("withFrame", () => {
  it("sets the frame and keeps other parameters", () => {
    expect(withFrame("?lang=en&unit=A-1", 4)).toBe("?lang=en&unit=A-1&frame=4");
    expect(withFrame("?frame=2", 7)).toBe("?frame=7");
  });
});

describe("sceneOnFrame", () => {
  const scene: Scene = {
    id: "spin",
    kind: "building",
    type: "rotation-360",
    title: { ar: "دوران", en: "Spin" },
    image: { path: "images/poster.jpg", width: 100, height: 100 },
    rotation,
    hotspots: [
      { id: "a", points: sq(0), frames: { "1": sq(1), "2": sq(2) }, target: { unit: "A" } },
      { id: "b", points: sq(0), frames: { "2": sq(20) }, target: { unit: "B" } },
      { id: "poster-only", points: sq(0), target: { unit: "C" } },
    ],
    children: [],
  };

  it("uses the frame image and only the hotspots drawn on that frame", () => {
    const on1 = sceneOnFrame(scene, rotation, 1);
    expect(on1.image).toEqual({ path: "rotations/spin/f-01.jpg", width: 800, height: 600 });
    expect(on1.hotspots.map((h) => [h.id, h.points])).toEqual([["a", sq(1)]]);
    expect(sceneOnFrame(scene, rotation, 2).hotspots.map((h) => [h.id, h.points])).toEqual([
      ["a", sq(2)],
      ["b", sq(20)],
    ]);
    expect(sceneOnFrame(scene, rotation, 3).hotspots).toEqual([]);
  });
});

describe("fileBaseFrom", () => {
  it("strips the image path from its URL", () => {
    expect(fileBaseFrom("/files/demo/images/poster.jpg", "images/poster.jpg")).toBe("/files/demo/");
    expect(fileBaseFrom("/other.jpg", "images/poster.jpg")).toBe("");
  });
});
