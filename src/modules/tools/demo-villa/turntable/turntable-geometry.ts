// The villa as simple boxes for the turntable, and each apartment's strip of
// outer wall (the part of the building's outside that belongs to the unit).
import type { FloorId, Point, Rect, UnitGeometry, VillaGeometry } from "../geometry/types";
import { PARAPET_HEIGHT, STOREY_HEIGHT } from "../facade/facade-geometry";

export interface Box {
  id: string;
  rect: Rect;
  /** Bottom and top height in metres. */
  base: number;
  top: number;
}

/** One side of the footprint, walked clockwise (y grows south). */
export interface Wall {
  side: "north" | "east" | "south" | "west";
  from: Point;
  to: Point;
  /** Outward normal in plan. */
  normal: Point;
}

/** The part of a wall that belongs to a unit: from `from` to `to`, along the wall's direction. */
export interface WallSegment {
  wall: Wall;
  from: Point;
  to: Point;
}

export interface UnitStrip {
  code: string;
  floorId: FloorId;
  base: number;
  top: number;
  segments: WallSegment[];
}

export interface TurntableModel {
  footprint: Rect;
  /** Height of the main block's top (the roof parapet). */
  blockTop: number;
  /** Storey bands of the main block, from the ground up. */
  bands: { id: "ground" | "first" | "parapet"; base: number; top: number }[];
  /** Structures standing on the roof (stair and annex). */
  roofBoxes: Box[];
  strips: UnitStrip[];
}

export function footprintWalls(f: Rect): Wall[] {
  const [x0, y0, x1, y1] = [f.x, f.y, f.x + f.width, f.y + f.height];
  return [
    { side: "north", from: [x0, y0], to: [x1, y0], normal: [0, -1] },
    { side: "east", from: [x1, y0], to: [x1, y1], normal: [1, 0] },
    { side: "south", from: [x1, y1], to: [x0, y1], normal: [0, 1] },
    { side: "west", from: [x0, y1], to: [x0, y0], normal: [-1, 0] },
  ];
}

const clip = (r: Rect, f: Rect): Rect | undefined => {
  const x = Math.max(r.x, f.x);
  const y = Math.max(r.y, f.y);
  const width = Math.min(r.x + r.width, f.x + f.width) - x;
  const height = Math.min(r.y + r.height, f.y + f.height) - y;
  return width > 0 && height > 0 ? { x, y, width, height } : undefined;
};

/** Distance along the wall from its start. */
const along = (wall: Wall, [x, y]: Point) => Math.abs(x - wall.from[0]) + Math.abs(y - wall.from[1]);

const pointAt = (wall: Wall, t: number): Point => {
  const len = along(wall, wall.to);
  const k = t / len;
  return [wall.from[0] + (wall.to[0] - wall.from[0]) * k, wall.from[1] + (wall.to[1] - wall.from[1]) * k];
};

/** The stretch of `wall` covered by a unit's indoor footprint, if any (the hull of the parts touching it). */
function coveredStretch(wall: Wall, parts: readonly Rect[]): WallSegment | undefined {
  const ts: number[] = [];
  for (const p of parts) {
    const corners: Point[] = [[p.x, p.y], [p.x + p.width, p.y], [p.x + p.width, p.y + p.height], [p.x, p.y + p.height]];
    const onWall = corners.filter(([x, y]) => (wall.normal[0] === 0 ? y === wall.from[1] : x === wall.from[0]));
    if (onWall.length === 2) ts.push(...onWall.map((c) => along(wall, c)));
  }
  if (ts.length === 0) return undefined;
  return { wall, from: pointAt(wall, Math.min(...ts)), to: pointAt(wall, Math.max(...ts)) };
}

function unitStrip(unit: UnitGeometry, floorId: FloorId, base: number, footprint: Rect): UnitStrip {
  const parts = unit.parts.map((p) => clip(p, footprint)).filter((p): p is Rect => p !== undefined);
  const segments = footprintWalls(footprint)
    .map((w) => coveredStretch(w, parts))
    .filter((s): s is WallSegment => s !== undefined);
  return { code: unit.code, floorId, base, top: base + STOREY_HEIGHT[floorId], segments };
}

/** Boxes and unit strips of the villa; only full storeys (ground and first) get unit strips. */
export function buildTurntableModel(villa: VillaGeometry): TurntableModel {
  const footprint = villa.footprint;
  const groundTop = STOREY_HEIGHT.ground;
  const roofLevel = groundTop + STOREY_HEIGHT.first;
  const blockTop = roofLevel + PARAPET_HEIGHT;
  const roof = villa.floors.find((f) => f.id === "roof")!;
  const indoor = [...roof.common.map((c) => ({ id: c.id, rect: c.rect })), ...roof.units.flatMap((u) => u.rooms.filter((r) => r.kind === "indoor").map((r) => ({ id: r.id, rect: r.rect })))];
  const roofBoxes: Box[] = indoor.map((r) => ({ id: r.id, rect: r.rect, base: blockTop, top: roofLevel + STOREY_HEIGHT.roof }));
  const strips: UnitStrip[] = [];
  let base = 0;
  for (const floor of villa.floors) {
    if (floor.id === "roof") break;
    for (const unit of floor.units) strips.push(unitStrip(unit, floor.id, base, footprint));
    base += STOREY_HEIGHT[floor.id];
  }
  return {
    footprint,
    blockTop,
    bands: [
      { id: "ground", base: 0, top: groundTop },
      { id: "first", base: groundTop, top: roofLevel },
      { id: "parapet", base: roofLevel, top: blockTop },
    ],
    roofBoxes,
    strips,
  };
}

