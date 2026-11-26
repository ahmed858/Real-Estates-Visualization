import { describe, expect, it } from "vitest";
import type { Point } from "@/modules/schema";
import {
  clampToImage,
  closesPolygon,
  distanceToSegment,
  isSelfIntersecting,
  nearestEdge,
  nearestVertex,
  polygonArea,
  roundPoint,
  segmentsIntersect,
} from "../index";

const square: Point[] = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
];

describe("clampToImage and roundPoint", () => {
  it("keeps points inside the image", () => {
    const image = { width: 100, height: 50 };
    expect(clampToImage([-5, 20], image)).toEqual([0, 20]);
    expect(clampToImage([120, 60], image)).toEqual([100, 50]);
    expect(clampToImage([30, 40], image)).toEqual([30, 40]);
  });

  it("rounds to whole pixels", () => {
    expect(roundPoint([10.4, 10.5])).toEqual([10, 11]);
  });
});

describe("nearest vertex and edge", () => {
  it("finds the closest vertex", () => {
    expect(nearestVertex(square, [9, 1])).toEqual({ index: 1, distance: Math.hypot(1, 1) });
    expect(nearestVertex([], [0, 0])).toBeUndefined();
  });

  it("finds the closest edge, including the closing edge", () => {
    expect(nearestEdge(square, [5, 1])).toEqual({ index: 0, distance: 1 });
    expect(nearestEdge(square, [1, 5])).toEqual({ index: 3, distance: 1 });
    expect(nearestEdge([[0, 0]], [1, 1])).toBeUndefined();
  });

  it("measures distance to a segment, beyond its ends and for a zero-length segment", () => {
    expect(distanceToSegment([5, 3], [0, 0], [10, 0])).toBe(3);
    expect(distanceToSegment([13, 4], [0, 0], [10, 0])).toBe(5);
    expect(distanceToSegment([3, 4], [0, 0], [0, 0])).toBe(5);
  });
});

describe("closesPolygon", () => {
  it("closes near the first point once there are 3 points", () => {
    expect(closesPolygon(square.slice(0, 3), [1, 1], 2)).toBe(true);
    expect(closesPolygon(square.slice(0, 3), [3, 3], 2)).toBe(false);
  });

  it("never closes with fewer than 3 points", () => {
    expect(closesPolygon(square.slice(0, 2), [0, 0], 2)).toBe(false);
  });
});

describe("polygonArea", () => {
  it("is the enclosed area whatever the winding", () => {
    expect(polygonArea(square)).toBe(100);
    expect(polygonArea([...square].reverse())).toBe(100);
  });

  it("is 0 for degenerate polygons", () => {
    expect(polygonArea([])).toBe(0);
    expect(polygonArea([[0, 0], [5, 5]])).toBe(0);
    expect(polygonArea([[0, 0], [5, 5], [10, 10]])).toBe(0);
  });
});

describe("self-intersection", () => {
  it("accepts simple polygons, convex and concave", () => {
    expect(isSelfIntersecting(square)).toBe(false);
    expect(isSelfIntersecting([[0, 0], [10, 0], [10, 10], [5, 4], [0, 10]])).toBe(false);
  });

  it("rejects a bow tie", () => {
    expect(isSelfIntersecting([[0, 0], [10, 10], [10, 0], [0, 10]])).toBe(true);
  });

  it("rejects zero-area shapes and edges that touch", () => {
    expect(isSelfIntersecting([[0, 0], [5, 5], [10, 10]])).toBe(true);
    expect(isSelfIntersecting([[0, 0], [10, 0], [5, 0], [5, 5]])).toBe(true);
  });

  it("has nothing to check below 3 points", () => {
    expect(isSelfIntersecting([[0, 0], [1, 1]])).toBe(false);
  });

  it("detects touching and crossing segments", () => {
    expect(segmentsIntersect([0, 0], [10, 0], [5, -5], [5, 5])).toBe(true);
    expect(segmentsIntersect([0, 0], [10, 0], [10, 0], [10, 5])).toBe(true);
    expect(segmentsIntersect([0, 0], [10, 0], [0, 1], [10, 1])).toBe(false);
  });
});
