// The villa's south elevation (seen from the courtyard), in metres.
// Elevation coordinates: x is the same as on the plans (west → east, left → right
// when facing north), z is height above the ground. One band per floor; a band's
// outline becomes that floor's hotspot on the facade.
import type { FloorId, Opening, Point, Rect, VillaGeometry } from "../geometry/types";

/** Storey heights in metres, from the ground up. */
export const STOREY_HEIGHT: Record<FloorId, number> = { ground: 3.5, first: 3.2, roof: 3.0 };
/** Height of the roof parapet around the open terrace. */
export const PARAPET_HEIGHT = 1.1;
const SILL = 1.0;
const WINDOW_HEIGHT = 1.4;
const DOOR_HEIGHT = 2.2;

export interface ElevationOpening {
  kind: Opening["kind"];
  /** Rectangle in elevation coordinates: left x, bottom z, width, height. */
  x: number;
  z: number;
  width: number;
  height: number;
}

export interface FacadeBand {
  floorId: FloorId;
  /** Outline in elevation coordinates [x, z], clockwise as seen on the drawing. */
  outline: Point[];
  /** Floor level (bottom) and top of the band, in metres. */
  base: number;
  top: number;
  openings: ElevationOpening[];
}

export interface FacadeGeometry {
  /** Horizontal extent of the building. */
  left: number;
  right: number;
  /** Highest point of the building. */
  height: number;
  bands: FacadeBand[];
}

/** Openings in the south face: those on the southmost indoor wall at their position. */
function elevationOpenings(openings: readonly Opening[], covered: readonly Rect[], base: number): ElevationOpening[] {
  const southFace = (x: number) =>
    Math.max(...covered.filter((r) => x > r.x && x < r.x + r.width).map((r) => r.y + r.height));
  return openings
    .filter((o) => o.axis === "x" && o.at[1] === southFace(o.at[0]))
    .map((o) => {
      const height = o.kind === "door" ? DOOR_HEIGHT : WINDOW_HEIGHT;
      return { kind: o.kind, x: o.at[0] - o.width / 2, z: base + (o.kind === "door" ? 0 : SILL), width: o.width, height };
    })
    .sort((a, b) => a.x - b.x || a.z - b.z);
}

/**
 * Builds the south elevation. Full storeys span the footprint; the roof band is
 * the parapet across the whole width plus the taller roof structures (stair and
 * annex), taken from the roof plan's indoor rooms and stair.
 */
export function buildFacadeGeometry(villa: VillaGeometry): FacadeGeometry {
  const left = villa.footprint.x;
  const right = villa.footprint.x + villa.footprint.width;
  const bands: FacadeBand[] = [];
  let base = 0;
  for (const floor of villa.floors) {
    const covered = [...floor.common.map((c) => c.rect), ...floor.units.flatMap((u) => u.rooms.filter((r) => r.kind === "indoor").map((r) => r.rect))];
    const openings = elevationOpenings(floor.openings, covered, base);
    if (floor.id !== "roof") {
      const top = base + STOREY_HEIGHT[floor.id];
      bands.push({ floorId: floor.id, base, top, openings, outline: [[left, top], [right, top], [right, base], [left, base]] });
      base = top;
      continue;
    }
    const roofLeft = Math.min(...covered.map((r) => r.x));
    const roofRight = Math.max(...covered.map((r) => r.x + r.width));
    const parapet = base + PARAPET_HEIGHT;
    const top = base + STOREY_HEIGHT.roof;
    const outline: Point[] = [[left, parapet], [roofLeft, parapet], [roofLeft, top], [roofRight, top]];
    if (roofRight < right) outline.push([roofRight, parapet], [right, parapet]);
    outline.push([right, base], [left, base]);
    bands.push({ floorId: floor.id, base, top, openings, outline });
  }
  return { left, right, height: Math.max(...bands.map((b) => b.top)), bands };
}
