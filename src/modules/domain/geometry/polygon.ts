// Pure polygon helpers for drawing hotspots, in image pixel coordinates.
// A polygon is its vertices in order; the closing edge (last -> first) is implied.
import type { Point } from "@/modules/schema";

export interface ImageSize {
  width: number;
  height: number;
}

/** Keeps a point inside the image: 0 <= x <= width, 0 <= y <= height. */
export function clampToImage([x, y]: Point, { width, height }: ImageSize): Point {
  return [Math.min(Math.max(x, 0), width), Math.min(Math.max(y, 0), height)];
}

/** Rounds a point to whole pixels. */
export function roundPoint([x, y]: Point): Point {
  return [Math.round(x), Math.round(y)];
}

export function distance([ax, ay]: Point, [bx, by]: Point): number {
  return Math.hypot(bx - ax, by - ay);
}

/** Shortest distance from p to the segment a-b. */
export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return distance(p, a);
  const t = Math.min(Math.max(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lengthSq, 0), 1);
  return distance(p, [a[0] + t * dx, a[1] + t * dy]);
}

export interface NearestVertex {
  index: number;
  distance: number;
}

/** The vertex closest to p, or undefined for an empty polygon. */
export function nearestVertex(points: readonly Point[], p: Point): NearestVertex | undefined {
  let best: NearestVertex | undefined;
  points.forEach((v, index) => {
    const d = distance(v, p);
    if (!best || d < best.distance) best = { index, distance: d };
  });
  return best;
}

export interface NearestEdge {
  /** The edge from points[index] to points[(index + 1) % length]. */
  index: number;
  distance: number;
}

/** The edge closest to p, including the closing edge; undefined with fewer than 2 points. */
export function nearestEdge(points: readonly Point[], p: Point): NearestEdge | undefined {
  if (points.length < 2) return undefined;
  let best: NearestEdge | undefined;
  points.forEach((a, index) => {
    const b = points[(index + 1) % points.length];
    const d = distanceToSegment(p, a, b);
    if (!best || d < best.distance) best = { index, distance: d };
  });
  return best;
}

/** True when a click at p should close the shape: at least 3 points and p within `tolerance` of the first. */
export function closesPolygon(points: readonly Point[], p: Point, tolerance: number): boolean {
  return points.length >= 3 && distance(points[0], p) <= tolerance;
}

/** Area enclosed by the polygon (shoelace formula), always >= 0. */
export function polygonArea(points: readonly Point[]): number {
  if (points.length < 3) return 0;
  let twice = 0;
  points.forEach(([x1, y1], i) => {
    const [x2, y2] = points[(i + 1) % points.length];
    twice += x1 * y2 - x2 * y1;
  });
  return Math.abs(twice) / 2;
}

function orientation(a: Point, b: Point, c: Point): number {
  const v = (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1]);
  return v === 0 ? 0 : v > 0 ? 1 : -1;
}

function onSegment(a: Point, p: Point, b: Point): boolean {
  return p[0] <= Math.max(a[0], b[0]) && p[0] >= Math.min(a[0], b[0]) && p[1] <= Math.max(a[1], b[1]) && p[1] >= Math.min(a[1], b[1]);
}

/** True when segments p1-p2 and q1-q2 touch or cross. */
export function segmentsIntersect(p1: Point, p2: Point, q1: Point, q2: Point): boolean {
  const o1 = orientation(p1, p2, q1);
  const o2 = orientation(p1, p2, q2);
  const o3 = orientation(q1, q2, p1);
  const o4 = orientation(q1, q2, p2);
  if (o1 !== o2 && o3 !== o4) return true;
  return (
    (o1 === 0 && onSegment(p1, q1, p2)) ||
    (o2 === 0 && onSegment(p1, q2, p2)) ||
    (o3 === 0 && onSegment(q1, p1, q2)) ||
    (o4 === 0 && onSegment(q1, p2, q2))
  );
}

/**
 * True when two non-adjacent edges of the closed polygon touch or cross
 * (a "bow tie"), or when the polygon has zero area. Such a shape cannot be
 * clicked reliably and should be fixed before export.
 */
export function isSelfIntersecting(points: readonly Point[]): boolean {
  const n = points.length;
  if (n < 3) return false;
  if (polygonArea(points) === 0) return true;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const adjacent = j === i + 1 || (i === 0 && j === n - 1);
      if (adjacent) continue;
      if (segmentsIntersect(points[i], points[(i + 1) % n], points[j], points[(j + 1) % n])) return true;
    }
  }
  return false;
}
