// Renders one floor of the demo villa as a clean architectural SVG plan:
// rooms, walls, doors and windows, room labels, a north arrow and a scale bar.
import { area } from "../geometry/rect";
import type { FloorGeometry, FloorId, Opening, Rect, Room, VillaGeometry, Wall } from "../geometry/types";
import { floorPlanFrame, type PlanFrame } from "./frame";
import { el, num, points, svgDocument, text } from "./svg";

const COLORS = {
  paper: "#ffffff",
  indoor: "#f7f4ee",
  outdoor: "#e6eee0",
  stair: "#ebe7df",
  ink: "#262626",
  muted: "#6b6b6b",
  plot: "#9a9a9a",
};
const FONT = "Helvetica, Arial, sans-serif";

function rectEl(frame: PlanFrame, r: Rect, a: Record<string, string | number>): string {
  const [x, y] = frame.toPx([r.x, r.y]);
  return el("rect", { x, y, width: frame.len(r.width), height: frame.len(r.height), ...a });
}

function roomEl(frame: PlanFrame, room: Room): string {
  return rectEl(frame, room.rect, { fill: room.kind === "indoor" ? COLORS.indoor : COLORS.outdoor });
}

function roomLabel(frame: PlanFrame, room: Room): string {
  const [cx, cy] = frame.toPx([room.rect.x + room.rect.width / 2, room.rect.y + room.rect.height / 2]);
  const common = { "text-anchor": "middle", "font-family": FONT, fill: COLORS.ink };
  return el("g", {}, [
    text(room.name.en, { ...common, x: cx, y: cy - 8, "font-size": 13, "font-weight": 600 }),
    text(room.name.ar, { ...common, x: cx, y: cy + 8, "font-size": 12 }),
    text(`${num(area(room.rect))} m²`, { ...common, x: cx, y: cy + 23, "font-size": 11, fill: COLORS.muted }),
  ]);
}

function stairEl(frame: PlanFrame, r: Rect): string {
  const treads: string[] = [];
  for (let y = r.y + 0.3; y < r.y + r.height - 0.01; y += 0.3) {
    const [x1, py] = frame.toPx([r.x, y]);
    const [x2] = frame.toPx([r.x + r.width, y]);
    treads.push(el("line", { x1, y1: py, x2, y2: py, stroke: COLORS.muted, "stroke-width": 1 }));
  }
  return el("g", {}, [rectEl(frame, r, { fill: COLORS.stair }), ...treads]);
}

function wallEl(frame: PlanFrame, wall: Wall): string {
  const [x1, y1] = frame.toPx(wall.from);
  const [x2, y2] = frame.toPx(wall.to);
  const dashed = wall.kind === "fence" ? { "stroke-dasharray": "6 4" } : {};
  const color = wall.kind === "fence" || wall.kind === "parapet" ? COLORS.muted : COLORS.ink;
  return el("line", { x1, y1, x2, y2, stroke: color, "stroke-width": frame.len(wall.thickness), "stroke-linecap": "square", ...dashed });
}

/** A gap in the wall, then a door leaf with its swing arc, or a window's glazing lines. */
function openingEl(frame: PlanFrame, o: Opening): string {
  const half = o.width / 2;
  const [ax, ay] = o.at;
  const [p1, p2] = o.axis === "x" ? [[ax - half, ay] as const, [ax + half, ay] as const] : [[ax, ay - half] as const, [ax, ay + half] as const];
  const [x1, y1] = frame.toPx(p1);
  const [x2, y2] = frame.toPx(p2);
  const gap = el("line", { x1, y1, x2, y2, stroke: COLORS.paper, "stroke-width": frame.len(0.3) });
  if (o.kind === "window") {
    const off = frame.len(0.06);
    const [dx, dy] = o.axis === "x" ? [0, off] : [off, 0];
    const glass = (s: number) => el("line", { x1: x1 + s * dx, y1: y1 + s * dy, x2: x2 + s * dx, y2: y2 + s * dy, stroke: COLORS.ink, "stroke-width": 1.5 });
    return el("g", {}, [gap, glass(-1), glass(1)]);
  }
  // Door hinged at p1, leaf drawn open at 90°, swing arc back to p2.
  const r = frame.len(o.width);
  const [lx, ly] = o.axis === "x" ? [x1, y1 + r] : [x1 + r, y1];
  const leaf = el("line", { x1, y1, x2: lx, y2: ly, stroke: COLORS.ink, "stroke-width": 1.5 });
  const arc = el("path", { d: `M ${num(lx)} ${num(ly)} A ${num(r)} ${num(r)} 0 0 ${o.axis === "x" ? 0 : 1} ${num(x2)} ${num(y2)}`, fill: "none", stroke: COLORS.muted, "stroke-width": 1 });
  return el("g", {}, [gap, leaf, arc]);
}

function northArrow(frame: PlanFrame): string {
  const cx = frame.width - 36;
  const cy = 34;
  return el("g", { "font-family": FONT }, [
    el("polygon", { points: points([[cx, cy - 18], [cx + 8, cy + 8], [cx, cy + 3], [cx - 8, cy + 8]]), fill: COLORS.ink }),
    text("N", { x: cx, y: cy + 24, "text-anchor": "middle", "font-size": 12, "font-weight": 700, fill: COLORS.ink }),
  ]);
}

function scaleBar(frame: PlanFrame, x: number, y: number): string {
  const step = frame.len(1);
  const blocks = [0, 1, 2, 3, 4].map((i) =>
    el("rect", { x: x + i * step, y, width: step, height: 6, fill: i % 2 === 0 ? COLORS.ink : COLORS.paper, stroke: COLORS.ink, "stroke-width": 1 }),
  );
  const label = (value: string, at: number) => text(value, { x: at, y: y + 20, "text-anchor": "middle", "font-family": FONT, "font-size": 11, fill: COLORS.ink });
  return el("g", {}, [...blocks, label("0", x), label("5 m", x + 5 * step)]);
}

function footer(frame: PlanFrame, floor: FloorGeometry, villa: VillaGeometry): string {
  const [left, bottom] = frame.toPx([villa.plot.x, villa.plot.y + villa.plot.height]);
  const [right] = frame.toPx([villa.plot.x + villa.plot.width, 0]);
  const y = bottom + 50;
  return el("g", {}, [
    text(floor.title.en, { x: left, y, "font-family": FONT, "font-size": 20, "font-weight": 700, fill: COLORS.ink }),
    text(floor.title.ar, { x: left, y: y + 26, "font-family": FONT, "font-size": 18, fill: COLORS.ink }),
    scaleBar(frame, right - frame.len(5), y - 10),
  ]);
}

export function renderFloorPlanSvg(villa: VillaGeometry, floorId: FloorId): string {
  const floor = villa.floors.find((f) => f.id === floorId);
  if (!floor) throw new Error(`unknown floor "${floorId}"`);
  const frame = floorPlanFrame(villa);
  const rooms = floor.units.flatMap((u) => u.rooms);
  const body = [
    el("rect", { x: 0, y: 0, width: frame.width, height: frame.height, fill: COLORS.paper }),
    rectEl(frame, villa.plot, { fill: "none", stroke: COLORS.plot, "stroke-width": 1, "stroke-dasharray": "10 6" }),
    el("g", { id: "rooms" }, rooms.map((r) => roomEl(frame, r))),
    el("g", { id: "common" }, floor.common.map((c) => stairEl(frame, c.rect))),
    el("g", { id: "walls" }, floor.walls.map((w) => wallEl(frame, w))),
    el("g", { id: "openings" }, floor.openings.map((o) => openingEl(frame, o))),
    el("g", { id: "labels" }, rooms.map((r) => roomLabel(frame, r))),
    northArrow(frame),
    footer(frame, floor, villa),
  ];
  return svgDocument(frame.width, frame.height, body, `${floor.title.en} · ${floor.title.ar}`);
}
