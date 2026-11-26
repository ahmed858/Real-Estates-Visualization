import { describe, expect, it } from "vitest";
import { buildVillaGeometry } from "../../index";
import { area, contains, containsPoint, overlaps, polygonArea } from "./rect";
import type { Point, Rect, UnitGeometry, Wall } from "./types";

const villa = buildVillaGeometry();
const allUnits = villa.floors.flatMap((f) => f.units);

function pointInPolygon([x, y]: Point, polygon: readonly Point[]): boolean {
  let inside = false;
  polygon.forEach(([x1, y1], i) => {
    const [x2, y2] = polygon[(i + 1) % polygon.length];
    if (y1 > y !== y2 > y && x < ((x2 - x1) * (y - y1)) / (y2 - y1) + x1) inside = !inside;
  });
  return inside;
}

const centre = (r: Rect): Point => [r.x + r.width / 2, r.y + r.height / 2];

function onWall([x, y]: Point, axis: "x" | "y", wall: Wall): boolean {
  const [[x1, y1], [x2, y2]] = [wall.from, wall.to];
  if (axis === "x") return y1 === y2 && y === y1 && x > Math.min(x1, x2) && x < Math.max(x1, x2);
  return x1 === x2 && x === x1 && y > Math.min(y1, y2) && y < Math.max(y1, y2);
}

describe("buildVillaGeometry", () => {
  it("has three floors with five units in total", () => {
    expect(villa.floors.map((f) => [f.id, f.level, f.units.map((u) => u.code)])).toEqual([
      ["ground", 0, ["G-01", "G-02"]],
      ["first", 1, ["F-01", "F-02"]],
      ["roof", 2, ["R-01"]],
    ]);
  });

  it("is deterministic", () => {
    expect(JSON.stringify(buildVillaGeometry())).toBe(JSON.stringify(villa));
  });

  it("keeps the footprint and courtyard inside the plot", () => {
    expect(contains(villa.plot, villa.footprint)).toBe(true);
    expect(contains(villa.plot, villa.courtyard)).toBe(true);
    expect(overlaps(villa.footprint, villa.courtyard)).toBe(false);
  });

  it.each(villa.floors.map((f) => [f.id, f] as const))("%s: unit outlines do not overlap each other or the stair", (_, floor) => {
    const areas: Rect[][] = [...floor.units.map((u) => u.parts), ...floor.common.map((c) => [c.rect])];
    areas.forEach((a, i) =>
      areas.slice(i + 1).forEach((b) => {
        for (const p of a) for (const q of b) expect(overlaps(p, q), JSON.stringify([p, q])).toBe(false);
      }),
    );
  });

  it.each(allUnits.map((u) => [u.code, u] as const))("%s: lies inside the plot and is consistent", (_, unit: UnitGeometry) => {
    for (const part of unit.parts) expect(contains(villa.plot, part)).toBe(true);
    for (const point of unit.outline) expect(containsPoint(villa.plot, point)).toBe(true);
    // Parts do not overlap each other.
    unit.parts.forEach((p, i) => unit.parts.slice(i + 1).forEach((q) => expect(overlaps(p, q)).toBe(false)));
    // The outline is clockwise, encloses every part, and has the same area as the parts.
    expect(polygonArea(unit.outline)).toBeCloseTo(unit.areaM2, 6);
    for (const part of unit.parts) expect(pointInPolygon(centre(part), unit.outline)).toBe(true);
    // Rooms tile the parts: each room inside one part, no overlaps, same total area.
    for (const room of unit.rooms) expect(unit.parts.some((p) => contains(p, room.rect)), room.id).toBe(true);
    unit.rooms.forEach((r, i) => unit.rooms.slice(i + 1).forEach((s) => expect(overlaps(r.rect, s.rect)).toBe(false)));
    expect(unit.rooms.reduce((sum, r) => sum + area(r.rect), 0)).toBeCloseTo(unit.areaM2, 6);
    expect(new Set(unit.rooms.map((r) => r.id)).size).toBe(unit.rooms.length);
  });

  it("gives each ground floor unit its own half of the courtyard", () => {
    const yards = villa.floors[0].units.map((u) => u.rooms.find((r) => r.id === "courtyard")!.rect);
    expect(yards).toHaveLength(2);
    expect(overlaps(yards[0], yards[1])).toBe(false);
    expect(area(yards[0]) + area(yards[1])).toBe(area(villa.courtyard));
    for (const yard of yards) expect(contains(villa.courtyard, yard)).toBe(true);
  });

  it("mirrors the east units from the west units", () => {
    const [g1, g2] = villa.floors[0].units;
    expect(g2.areaM2).toBe(g1.areaM2);
    expect(g2.indoorAreaM2).toBe(g1.indoorAreaM2);
    expect(g1.areaM2).toBe(186);
    expect(g1.indoorAreaM2).toBe(106);
    expect(polygonArea(g2.outline)).toBeGreaterThan(0);
  });

  it.each(villa.floors.map((f) => [f.id, f] as const))("%s: walls are axis-aligned and openings sit on a wall", (_, floor) => {
    for (const wall of floor.walls) {
      expect(wall.from[0] === wall.to[0] || wall.from[1] === wall.to[1]).toBe(true);
      expect(containsPoint(villa.plot, wall.from) && containsPoint(villa.plot, wall.to)).toBe(true);
    }
    for (const opening of floor.openings) {
      expect(floor.walls.some((w) => onWall(opening.at, opening.axis, w)), JSON.stringify(opening)).toBe(true);
    }
  });

  it("encloses each floor with exterior walls, a parapet on the roof and fences around the courtyard", () => {
    const kinds = (i: number) => new Set(villa.floors[i].walls.map((w) => w.kind));
    expect(kinds(0)).toEqual(new Set(["exterior", "interior", "fence"]));
    expect(kinds(1)).toEqual(new Set(["exterior", "interior"]));
    expect(kinds(2)).toEqual(new Set(["exterior", "interior", "parapet"]));
    const perimeter = (i: number) =>
      villa.floors[i].walls
        .filter((w) => w.kind === "exterior" || w.kind === "parapet")
        .reduce((sum, w) => sum + Math.abs(w.to[0] - w.from[0]) + Math.abs(w.to[1] - w.from[1]), 0);
    const footprintPerimeter = 2 * (villa.footprint.width + villa.footprint.height);
    for (const i of [0, 1, 2]) expect(perimeter(i)).toBe(footprintPerimeter);
  });
});
