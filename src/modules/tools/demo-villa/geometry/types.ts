// Plain data describing the demo villa. All lengths are metres in one shared
// coordinate system for every floor: origin at the plot's north-west corner,
// x grows east, y grows south (the same orientation as image pixels).

export type Point = readonly [x: number, y: number];

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LocalizedText {
  ar: string;
  en: string;
}

export type FloorId = "ground" | "first" | "roof";
export type RoomKind = "indoor" | "outdoor";
export type WallKind = "exterior" | "interior" | "fence" | "parapet";

export interface Room {
  /** Unique within its unit, e.g. "bedroom-1". */
  id: string;
  name: LocalizedText;
  kind: RoomKind;
  rect: Rect;
}

export interface UnitGeometry {
  /** Unit code, as used by hotspots and the units sheet, e.g. "G-01". */
  code: string;
  type: string;
  /** Rectangles that together make up the unit; they do not overlap. */
  parts: Rect[];
  /** Outline polygon of the union of `parts`, clockwise, no repeated first point. */
  outline: Point[];
  /** Rooms tile the parts exactly. */
  rooms: Room[];
  /** Total area of the parts, indoor and outdoor, in m². */
  areaM2: number;
  /** Indoor area only, in m². */
  indoorAreaM2: number;
}

export interface CommonArea {
  id: string;
  name: LocalizedText;
  rect: Rect;
}

export interface Wall {
  from: Point;
  to: Point;
  kind: WallKind;
  /** Wall thickness in metres. */
  thickness: number;
}

export interface Opening {
  kind: "door" | "window";
  /** Centre of the opening; it lies on a wall. */
  at: Point;
  /** Direction of the wall it sits in. */
  axis: "x" | "y";
  width: number;
}

export interface FloorGeometry {
  id: FloorId;
  /** Floor number: 0 ground, 1 first, 2 roof. */
  level: number;
  title: LocalizedText;
  units: UnitGeometry[];
  common: CommonArea[];
  walls: Wall[];
  openings: Opening[];
}

export interface VillaGeometry {
  /** Whole plot; every floor's content lies inside it. */
  plot: Rect;
  /** Building footprint, the same on every floor. */
  footprint: Rect;
  /** Ground floor courtyard (hosh), split between the ground floor units. */
  courtyard: Rect;
  floors: FloorGeometry[];
}
