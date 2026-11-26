import { describe, expect, it } from "vitest";
import { span } from "./rect";
import { mergeSegments, onBoundary, rectEdges, subtractSegments } from "./segments";

describe("wall segments", () => {
  it("merges touching and overlapping collinear edges", () => {
    const edges = [...rectEdges(span(0, 0, 2, 1)), ...rectEdges(span(2, 0, 5, 1))];
    expect(mergeSegments(edges)).toEqual([
      { axis: "x", at: 0, from: 0, to: 5 },
      { axis: "x", at: 1, from: 0, to: 5 },
      { axis: "y", at: 0, from: 0, to: 1 },
      { axis: "y", at: 2, from: 0, to: 1 },
      { axis: "y", at: 5, from: 0, to: 1 },
    ]);
  });

  it("subtracts covered parts of a line", () => {
    const line = [{ axis: "x" as const, at: 0, from: 0, to: 10 }];
    const cover = [{ axis: "x" as const, at: 0, from: 2, to: 4 }, { axis: "x" as const, at: 1, from: 0, to: 10 }];
    expect(subtractSegments(line, cover)).toEqual([
      { axis: "x", at: 0, from: 0, to: 2 },
      { axis: "x", at: 0, from: 4, to: 10 },
    ]);
  });

  it("detects segments on a rectangle's boundary", () => {
    const r = span(0, 0, 4, 4);
    expect(onBoundary({ axis: "y", at: 4, from: 1, to: 3 }, r)).toBe(true);
    expect(onBoundary({ axis: "y", at: 2, from: 1, to: 3 }, r)).toBe(false);
  });
});
