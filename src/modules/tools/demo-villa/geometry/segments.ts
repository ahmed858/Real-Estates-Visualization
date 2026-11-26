// Turns rectangle edges into merged wall segments: collinear edges that touch
// or overlap become one segment, so every wall is drawn once.
import type { Point, Rect } from "./types";

/** A horizontal (axis "x", fixed y) or vertical (axis "y", fixed x) segment from `from` to `to`. */
export interface AxisSegment {
  axis: "x" | "y";
  at: number;
  from: number;
  to: number;
}

export function rectEdges(r: Rect): AxisSegment[] {
  const x2 = r.x + r.width;
  const y2 = r.y + r.height;
  return [
    { axis: "x", at: r.y, from: r.x, to: x2 },
    { axis: "x", at: y2, from: r.x, to: x2 },
    { axis: "y", at: r.x, from: r.y, to: y2 },
    { axis: "y", at: x2, from: r.y, to: y2 },
  ];
}

const lineKey = (s: AxisSegment) => `${s.axis}:${s.at}`;

function byLine(segments: readonly AxisSegment[]): Map<string, AxisSegment[]> {
  const lines = new Map<string, AxisSegment[]>();
  for (const s of segments) lines.set(lineKey(s), [...(lines.get(lineKey(s)) ?? []), s]);
  return lines;
}

/** Merges touching or overlapping collinear segments. Output is sorted, so it is deterministic. */
export function mergeSegments(segments: readonly AxisSegment[]): AxisSegment[] {
  const out: AxisSegment[] = [];
  for (const line of byLine(segments).values()) {
    const sorted = [...line].sort((a, b) => a.from - b.from);
    let current = { ...sorted[0] };
    for (const s of sorted.slice(1)) {
      if (s.from <= current.to) current.to = Math.max(current.to, s.to);
      else {
        out.push(current);
        current = { ...s };
      }
    }
    out.push(current);
  }
  return sortSegments(out);
}

/** Parts of `segments` not covered by `cover` on the same line. */
export function subtractSegments(segments: readonly AxisSegment[], cover: readonly AxisSegment[]): AxisSegment[] {
  const covering = byLine(mergeSegments(cover));
  const out: AxisSegment[] = [];
  for (const s of mergeSegments(segments)) {
    let pieces = [{ ...s }];
    for (const c of covering.get(lineKey(s)) ?? []) {
      pieces = pieces.flatMap((p) => {
        if (c.to <= p.from || c.from >= p.to) return [p];
        const left = { ...p, to: c.from };
        const right = { ...p, from: c.to };
        return [left, right].filter((q) => q.to > q.from);
      });
    }
    out.push(...pieces);
  }
  return sortSegments(out);
}

function sortSegments(segments: AxisSegment[]): AxisSegment[] {
  return segments.sort((a, b) => a.axis.localeCompare(b.axis) || a.at - b.at || a.from - b.from);
}

/** True when the segment lies on the rectangle's boundary. */
export function onBoundary(s: AxisSegment, r: Rect): boolean {
  return rectEdges(r).some((e) => e.axis === s.axis && e.at === s.at && s.from >= e.from && s.to <= e.to);
}

export function segmentEnds(s: AxisSegment): [Point, Point] {
  return s.axis === "x"
    ? [
        [s.from, s.at],
        [s.to, s.at],
      ]
    : [
        [s.at, s.from],
        [s.at, s.to],
      ];
}
