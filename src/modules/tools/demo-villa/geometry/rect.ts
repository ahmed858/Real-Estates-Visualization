// Small geometry helpers on axis-aligned rectangles and points.
import type { Point, Rect } from "./types";

export const rect = (x: number, y: number, width: number, height: number): Rect => ({ x, y, width, height });

/** Rectangle from two opposite corners. */
export const span = (x1: number, y1: number, x2: number, y2: number): Rect => rect(x1, y1, x2 - x1, y2 - y1);

export const area = (r: Rect): number => r.width * r.height;

/** Mirrors a rectangle about the vertical line x = axisX. */
export const mirrorX = (r: Rect, axisX: number): Rect => rect(2 * axisX - (r.x + r.width), r.y, r.width, r.height);

/** True when the rectangles share some area (touching edges do not count). */
export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/** True when `inner` lies inside `outer` (edges may touch). */
export function contains(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

export function containsPoint(outer: Rect, [x, y]: Point): boolean {
  return x >= outer.x && y >= outer.y && x <= outer.x + outer.width && y <= outer.y + outer.height;
}

/** Signed area of a polygon by the shoelace formula; positive when clockwise in y-down coordinates. */
export function polygonArea(points: readonly Point[]): number {
  let sum = 0;
  points.forEach(([x1, y1], i) => {
    const [x2, y2] = points[(i + 1) % points.length];
    sum += x1 * y2 - x2 * y1;
  });
  return sum / 2;
}

/** Rounds to centimetres so derived values stay exact and stable. */
export const round = (n: number): number => Math.round(n * 100) / 100;
