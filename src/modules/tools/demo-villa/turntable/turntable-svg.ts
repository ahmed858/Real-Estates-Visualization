// Draws the demo turntable: one SVG per frame (the villa block seen from that
// angle) and, from the same camera, each unit's polygon on every frame where
// it can be seen. Original drawings, flat colours, no textures.
import type { Point, Rect, VillaGeometry } from "../geometry/types";
import { el, points, svgDocument, text } from "../svg/svg";
import { frameAngle, TURNTABLE_FRAMES, TURNTABLE_HEIGHT, TURNTABLE_WIDTH, turntableCamera, type TurntableCamera, type WorldPoint } from "./turntable-camera";
import { buildTurntableModel, footprintWalls, type Box, type TurntableModel, type UnitStrip, type WallSegment } from "./turntable-geometry";

const FONT = "Helvetica, Arial, sans-serif";
const COLORS = {
  sky: "#f4f6f8",
  plot: "#e3ddd0",
  courtyard: "#d6e4cf",
  ink: "#262626",
  muted: "#6b6b6b",
  roof: "#d9d4ca",
  structure: "#f7f4ee",
  band: { ground: "#efe9df", first: "#f5f1ea", parapet: "#e6e0d5" },
};
/** Faces turned away from the light are drawn darker by this factor. */
const SHADE = 0.86;

const centreOf = (r: Rect): Point => [r.x + r.width / 2, r.y + r.height / 2];
const corners = (r: Rect, z: number): WorldPoint[] => [
  [r.x, r.y, z],
  [r.x + r.width, r.y, z],
  [r.x + r.width, r.y + r.height, z],
  [r.x, r.y + r.height, z],
];

function shade(hex: string, normal: Point): string {
  // Light from the south-west of the plan: faces turned north or east are darker.
  if (normal[0] <= 0 && normal[1] >= 0) return hex;
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v * SHADE));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function face(cam: TurntableCamera, from: Point, to: Point, base: number, top: number): [number, number][] {
  return [cam.toPx([from[0], from[1], top]), cam.toPx([to[0], to[1], top]), cam.toPx([to[0], to[1], base]), cam.toPx([from[0], from[1], base])];
}

/** Visible side faces and the top of a box, as SVG polygons. */
function boxEls(cam: TurntableCamera, box: Pick<Box, "rect" | "base" | "top">, fill: string, bands?: TurntableModel["bands"]): string[] {
  const out: string[] = [];
  for (const wall of footprintWalls(box.rect)) {
    if (!cam.faces(wall.normal)) continue;
    for (const band of bands ?? [{ id: "parapet" as const, base: box.base, top: box.top }]) {
      const colour = bands ? COLORS.band[band.id] : fill;
      out.push(el("polygon", { points: points(face(cam, wall.from, wall.to, band.base, band.top)), fill: shade(colour, wall.normal), stroke: COLORS.ink, "stroke-width": 1.5, "stroke-linejoin": "round" }));
    }
  }
  out.push(el("polygon", { points: points(corners(box.rect, box.top).map(cam.toPx)), fill: bands ? COLORS.roof : fill, stroke: COLORS.ink, "stroke-width": 1.5, "stroke-linejoin": "round" }));
  return out;
}

const segmentKey = ([x, y]: Point) => `${x},${y}`;

/**
 * The unit's visible strip of outer wall on this frame, as one polygon in frame
 * pixels: the top edge along the visible wall segments, then the bottom edge
 * back. Undefined when none of its walls faces the viewer.
 */
export function stripPolygon(cam: TurntableCamera, strip: UnitStrip): [number, number][] | undefined {
  const visible = strip.segments.map((s) => cam.faces(s.wall.normal));
  if (!visible.some(Boolean)) return undefined;
  // Start right after a hidden segment (or a gap), so the visible run is walked in order.
  const n = strip.segments.length;
  const joined = (a: WallSegment, b: WallSegment) => segmentKey(a.to) === segmentKey(b.from);
  let start = 0;
  for (let i = 0; i < n; i++) {
    const prev = (i + n - 1) % n;
    if (visible[i] && (!visible[prev] || !joined(strip.segments[prev], strip.segments[i]))) {
      start = i;
      break;
    }
  }
  const run: Point[] = [];
  let used = 0;
  for (let k = 0; k < n; k++) {
    const i = (start + k) % n;
    const s = strip.segments[i];
    if (!visible[i]) break;
    used++;
    if (run.length > 0 && segmentKey(run[run.length - 1]) !== segmentKey(s.from)) {
      throw new Error(`unit ${strip.code}: visible walls are not connected`);
    }
    if (run.length === 0) run.push(s.from);
    run.push(s.to);
  }
  if (used !== visible.filter(Boolean).length) throw new Error(`unit ${strip.code}: visible walls are not connected`);
  const top = run.map(([x, y]) => cam.toPx([x, y, strip.top]));
  const bottom = run.map(([x, y]) => cam.toPx([x, y, strip.base])).reverse();
  return [...top, ...bottom].map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100]);
}

const cameraFor = (villa: VillaGeometry, frame: number) => turntableCamera(frameAngle(frame), centreOf(villa.footprint));

export function renderTurntableFrameSvg(villa: VillaGeometry, frame: number): string {
  const cam = cameraFor(villa, frame);
  const model = buildTurntableModel(villa);
  const roofBoxes = [...model.roofBoxes].sort((a, b) => cam.depth(centreOf(a.rect)) - cam.depth(centreOf(b.rect)));
  const body = [
    el("rect", { x: 0, y: 0, width: TURNTABLE_WIDTH, height: TURNTABLE_HEIGHT, fill: COLORS.sky }),
    el("polygon", { points: points(corners(villa.plot, 0).map(cam.toPx)), fill: COLORS.plot, stroke: COLORS.muted, "stroke-width": 1 }),
    el("polygon", { points: points(corners(villa.courtyard, 0).map(cam.toPx)), fill: COLORS.courtyard, stroke: COLORS.muted, "stroke-width": 1 }),
    ...boxEls(cam, { rect: model.footprint, base: 0, top: model.blockTop }, COLORS.roof, model.bands),
    ...roofBoxes.flatMap((b) => boxEls(cam, b, COLORS.structure)),
    text(`Turntable · frame ${frame} of ${TURNTABLE_FRAMES}`, { x: 24, y: TURNTABLE_HEIGHT - 40, "font-family": FONT, "font-size": 14, "font-weight": 700, fill: COLORS.ink }),
    text(`عرض 360° · لقطة ${frame} من ${TURNTABLE_FRAMES}`, { x: 24, y: TURNTABLE_HEIGHT - 18, direction: "rtl", "text-anchor": "end", "font-family": FONT, "font-size": 13, fill: COLORS.muted }),
  ];
  return svgDocument(TURNTABLE_WIDTH, TURNTABLE_HEIGHT, body, `Turntable frame ${frame} · لقطة ${frame}`);
}

/** Every unit's polygon by frame number ("1".."24"), only on frames where it is seen. */
export function turntableUnitFrames(villa: VillaGeometry): { code: string; frames: Record<string, [number, number][]> }[] {
  const model = buildTurntableModel(villa);
  return model.strips.map((strip) => {
    const frames: Record<string, [number, number][]> = {};
    for (let f = 1; f <= TURNTABLE_FRAMES; f++) {
      const polygon = stripPolygon(cameraFor(villa, f), strip);
      if (polygon) frames[String(f)] = polygon;
    }
    return { code: strip.code, frames };
  });
}
