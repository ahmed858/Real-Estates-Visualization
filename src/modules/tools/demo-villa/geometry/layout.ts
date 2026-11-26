// The demo villa's fixed layout, in metres. Only the west (left) half is
// described; the east units are its mirror image about the villa's centre line.
// Plot 20 × 28 m, street on the north side. Building footprint 16 × 14 m with
// a 2 m setback; courtyard (hosh) 16 × 10 m south of the building.
import { span } from "./rect";
import type { FloorId, LocalizedText, Opening, Point, Rect, RoomKind } from "./types";

export const PLOT: Rect = span(0, 0, 20, 28);
export const FOOTPRINT: Rect = span(2, 2, 18, 16);
export const COURTYARD: Rect = span(2, 16, 18, 26);
/** Vertical line the east half mirrors about. */
export const CENTRE_X = 10;

export const WALL_THICKNESS = { exterior: 0.25, interior: 0.12, fence: 0.1, parapet: 0.15 } as const;

export interface RoomTemplate {
  id: string;
  name: LocalizedText;
  kind: RoomKind;
  rect: Rect;
}

export interface UnitTemplate {
  /** Unit codes: west unit, and east unit (mirrored) when there is one. */
  codes: readonly [west: string, east?: string];
  type: string;
  parts: Rect[];
  /** Clockwise outline of the union of the parts (y grows downward). */
  outline: Point[];
  rooms: RoomTemplate[];
  openings: Opening[];
}

export interface FloorTemplate {
  id: FloorId;
  level: number;
  title: LocalizedText;
  unit: UnitTemplate;
  /** Openings outside any unit (e.g. the stair entrance), not mirrored. */
  openings: Opening[];
}

export const STAIR: { id: string; name: LocalizedText; rect: Rect } = {
  id: "stair",
  name: { ar: "السلم", en: "Stair" },
  rect: span(8.5, 2, 11.5, 6),
};

const T = {
  kitchen: { ar: "مطبخ", en: "Kitchen" },
  bath: { ar: "حمام", en: "Bath" },
  living: { ar: "معيشة", en: "Living" },
  bedroom1: { ar: "غرفة نوم 1", en: "Bedroom 1" },
  bedroom2: { ar: "غرفة نوم 2", en: "Bedroom 2" },
  courtyard: { ar: "الحوش", en: "Courtyard" },
  terrace: { ar: "تراس", en: "Terrace" },
  annexRoom: { ar: "غرفة الملحق", en: "Annex room" },
  kitchenette: { ar: "مطبخ صغير", en: "Kitchenette" },
} satisfies Record<string, LocalizedText>;

const door = (x: number, y: number, axis: "x" | "y", width = 0.9): Opening => ({ kind: "door", at: [x, y], axis, width });
const window_ = (x: number, y: number, axis: "x" | "y", width: number): Opening => ({ kind: "window", at: [x, y], axis, width });

/** Rooms of a ground or first floor apartment (west half), without the courtyard. */
const apartmentRooms: RoomTemplate[] = [
  { id: "kitchen", name: T.kitchen, kind: "indoor", rect: span(2, 2, 5.5, 6) },
  { id: "bath", name: T.bath, kind: "indoor", rect: span(5.5, 2, 8.5, 6) },
  { id: "living", name: T.living, kind: "indoor", rect: span(2, 6, 10, 11) },
  { id: "bedroom-1", name: T.bedroom1, kind: "indoor", rect: span(2, 11, 6, 16) },
  { id: "bedroom-2", name: T.bedroom2, kind: "indoor", rect: span(6, 11, 10, 16) },
];

const apartmentOpenings: Opening[] = [
  door(9.25, 6, "x"), // entrance from the stair hall
  door(3.75, 6, "x"),
  door(7, 6, "x", 0.8),
  door(4, 11, "x"),
  door(8, 11, "x"),
  window_(3.75, 2, "x", 1.2),
  window_(2, 8.5, "y", 1.5),
  window_(2, 13.5, "y", 1.2),
  window_(8, 16, "x", 1.2),
];

export const FLOORS: readonly FloorTemplate[] = [
  {
    id: "ground",
    level: 0,
    title: { ar: "الدور الأرضي", en: "Ground floor" },
    unit: {
      codes: ["G-01", "G-02"],
      type: "Apartment",
      parts: [span(2, 2, 8.5, 6), span(2, 6, 10, 16), span(2, 16, 10, 26)],
      outline: [[2, 2], [8.5, 2], [8.5, 6], [10, 6], [10, 26], [2, 26]],
      rooms: [...apartmentRooms, { id: "courtyard", name: T.courtyard, kind: "outdoor", rect: span(2, 16, 10, 26) }],
      openings: [...apartmentOpenings, door(4, 16, "x")], // garden door to the courtyard
    },
    openings: [door(10, 2, "x", 1.2)], // street entrance to the stair
  },
  {
    id: "first",
    level: 1,
    title: { ar: "الدور الأول", en: "First floor" },
    unit: {
      codes: ["F-01", "F-02"],
      type: "Apartment",
      parts: [span(2, 2, 8.5, 6), span(2, 6, 10, 16)],
      outline: [[2, 2], [8.5, 2], [8.5, 6], [10, 6], [10, 16], [2, 16]],
      rooms: apartmentRooms,
      openings: [...apartmentOpenings, window_(4, 16, "x", 1.2)],
    },
    openings: [],
  },
  {
    id: "roof",
    level: 2,
    title: { ar: "السطح", en: "Roof" },
    unit: {
      codes: ["R-01"],
      type: "Annex",
      parts: [span(2, 2, 8.5, 6), span(11.5, 2, 18, 6), span(2, 6, 18, 16)],
      outline: [[2, 2], [8.5, 2], [8.5, 6], [11.5, 6], [11.5, 2], [18, 2], [18, 16], [2, 16]],
      rooms: [
        { id: "terrace-north", name: T.terrace, kind: "outdoor", rect: span(2, 2, 8.5, 6) },
        { id: "bath", name: T.bath, kind: "indoor", rect: span(11.5, 2, 14.5, 6) },
        { id: "kitchenette", name: T.kitchenette, kind: "indoor", rect: span(14.5, 2, 18, 6) },
        { id: "terrace-west", name: T.terrace, kind: "outdoor", rect: span(2, 6, 11.5, 16) },
        { id: "annex-room", name: T.annexRoom, kind: "indoor", rect: span(11.5, 6, 18, 11) },
        { id: "terrace-south", name: T.terrace, kind: "outdoor", rect: span(11.5, 11, 18, 16) },
      ],
      openings: [
        door(10, 6, "x"), // stair to terrace
        door(11.5, 8.5, "y"),
        door(13, 6, "x", 0.8),
        door(16.25, 6, "x"),
        window_(18, 8.5, "y", 1.5),
        window_(16.25, 2, "x", 1),
        window_(14.75, 11, "x", 1.5),
      ],
    },
    openings: [],
  },
];
