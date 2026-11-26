// Builds the demo villa's geometry from the fixed layout. Pure and deterministic:
// the same call always returns the same data.
import { CENTRE_X, COURTYARD, FLOORS, FOOTPRINT, PLOT, STAIR, WALL_THICKNESS, type FloorTemplate, type UnitTemplate } from "./layout";
import { area, mirrorX, rect, round } from "./rect";
import { mergeSegments, onBoundary, rectEdges, segmentEnds, subtractSegments, type AxisSegment } from "./segments";
import type { FloorGeometry, Opening, Point, Room, UnitGeometry, VillaGeometry, Wall, WallKind } from "./types";

const mirrorPoint = ([x, y]: Point): Point => [2 * CENTRE_X - x, y];

/** Mirrors an outline and reverses it so it stays clockwise, starting from its north-west corner. */
function mirrorOutline(outline: readonly Point[]): Point[] {
  const mirrored = outline.map(mirrorPoint).reverse();
  const start = mirrored.reduce((best, p, i) => (p[1] < mirrored[best][1] || (p[1] === mirrored[best][1] && p[0] < mirrored[best][0]) ? i : best), 0);
  return [...mirrored.slice(start), ...mirrored.slice(0, start)];
}

function buildUnit(template: UnitTemplate, code: string, mirrored: boolean): UnitGeometry {
  const flip = <T>(value: T, fn: (v: T) => T) => (mirrored ? fn(value) : value);
  const parts = template.parts.map((p) => flip(p, (r) => mirrorX(r, CENTRE_X)));
  const rooms: Room[] = template.rooms.map((r) => ({ ...r, rect: flip(r.rect, (x) => mirrorX(x, CENTRE_X)) }));
  return {
    code,
    type: template.type,
    parts,
    outline: mirrored ? mirrorOutline(template.outline) : [...template.outline],
    rooms,
    areaM2: round(parts.reduce((sum, p) => sum + area(p), 0)),
    indoorAreaM2: round(rooms.filter((r) => r.kind === "indoor").reduce((sum, r) => sum + area(r.rect), 0)),
  };
}

function mirrorOpening(o: Opening): Opening {
  return { ...o, at: mirrorPoint(o.at) };
}

function toWall(s: AxisSegment, kind: WallKind): Wall {
  const [from, to] = segmentEnds(s);
  return { from, to, kind, thickness: WALL_THICKNESS[kind] };
}

/**
 * Walls of a floor: every edge of an indoor room or the stair, merged, is a wall
 * (exterior when it lies on the footprint boundary). The roof adds a parapet on
 * the open parts of the footprint edge; the ground floor adds the courtyard fences.
 */
function buildWalls(floor: FloorTemplate, units: UnitGeometry[]): Wall[] {
  const indoor = [STAIR.rect, ...units.flatMap((u) => u.rooms.filter((r) => r.kind === "indoor").map((r) => r.rect))];
  const edges = mergeSegments(indoor.flatMap(rectEdges));
  const walls = edges.map((s) => toWall(s, onBoundary(s, FOOTPRINT) ? "exterior" : "interior"));
  if (floor.id === "roof") {
    walls.push(...subtractSegments(rectEdges(FOOTPRINT), edges).map((s) => toWall(s, "parapet")));
  }
  if (floor.id === "ground") {
    const fences: AxisSegment[] = rectEdges(COURTYARD).filter((s) => !onBoundary(s, FOOTPRINT));
    fences.push({ axis: "y", at: CENTRE_X, from: COURTYARD.y, to: COURTYARD.y + COURTYARD.height });
    walls.push(...mergeSegments(fences).map((s) => toWall(s, "fence")));
  }
  return walls;
}

function buildFloor(floor: FloorTemplate): FloorGeometry {
  const [westCode, eastCode] = floor.unit.codes;
  const units = [buildUnit(floor.unit, westCode, false)];
  const openings = [...floor.unit.openings, ...floor.openings];
  if (eastCode) {
    units.push(buildUnit(floor.unit, eastCode, true));
    openings.push(...floor.unit.openings.map(mirrorOpening));
  }
  return {
    id: floor.id,
    level: floor.level,
    title: floor.title,
    units,
    common: [{ ...STAIR }],
    walls: buildWalls(floor, units),
    openings,
  };
}

/** The demo villa: plot, courtyard, and per floor its units, rooms, walls and openings. */
export function buildVillaGeometry(): VillaGeometry {
  const copy = (r: typeof PLOT) => rect(r.x, r.y, r.width, r.height);
  return { plot: copy(PLOT), footprint: copy(FOOTPRINT), courtyard: copy(COURTYARD), floors: FLOORS.map(buildFloor) };
}
