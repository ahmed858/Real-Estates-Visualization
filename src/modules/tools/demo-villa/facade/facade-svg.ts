// Renders the villa's south elevation as SVG: one band per floor with its
// windows and doors. Band outlines double as the facade hotspots (U-204).
import type { FloorId, Point, VillaGeometry } from "../geometry/types";
import { el, points, svgDocument, text } from "../svg/svg";
import { buildFacadeGeometry, type ElevationOpening, type FacadeBand, type FacadeGeometry } from "./facade-geometry";

const SCALE = 40;
const SIDE = 80;
const TOP = 60;
const BOTTOM = 120;
const FONT = "Helvetica, Arial, sans-serif";
const COLORS = {
  paper: "#ffffff",
  ink: "#262626",
  muted: "#6b6b6b",
  ground: "#d9d3c7",
  glass: "#cfe0ea",
  door: "#8a6a4a",
  band: { ground: "#efe9df", first: "#f5f1ea", roof: "#ebe5da" } satisfies Record<FloorId, string>,
};

export interface FacadeFrame {
  width: number;
  height: number;
  /** Elevation [x, z] in metres → image pixels. */
  toPx: (point: Point) => [number, number];
}

export function facadeFrame(facade: FacadeGeometry): FacadeFrame {
  const width = (facade.right - facade.left) * SCALE + 2 * SIDE;
  const height = facade.height * SCALE + TOP + BOTTOM;
  return { width, height, toPx: ([x, z]) => [SIDE + (x - facade.left) * SCALE, TOP + (facade.height - z) * SCALE] };
}

const BUTTON_WIDTH = 150;
const BUTTON_GAP = 12;

/** Footer button `slot` counted from the right (0 = rightmost), in image pixels. */
function footerButtonPolygon(villa: VillaGeometry, slot: number): [number, number][] {
  const facade = buildFacadeGeometry(villa);
  const frame = facadeFrame(facade);
  const [, groundY] = frame.toPx([facade.left, 0]);
  const x1 = frame.width - SIDE - slot * (BUTTON_WIDTH + BUTTON_GAP);
  const [x0, y0, y1] = [x1 - BUTTON_WIDTH, groundY + 44, groundY + 96];
  return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
}

/** The "360° view" button drawn in the footer, bottom right; its rectangle is the facade hotspot that opens the turntable. */
export const turntableButtonPolygon = (villa: VillaGeometry) => footerButtonPolygon(villa, 0);

/** The "3D model" button, left of "360° view"; its rectangle is the facade hotspot that opens the 3D model scene. */
export const modelButtonPolygon = (villa: VillaGeometry) => footerButtonPolygon(villa, 1);

function footerButtonEl(id: string, polygon: [number, number][], en: string, ar: string): string {
  const [[x0, y0], [x1], [, y1]] = polygon.slice(0, 3) as [[number, number], [number, number], [number, number]];
  const cx = (x0 + x1) / 2;
  return el("g", { id }, [
    el("rect", { x: x0, y: y0, width: x1 - x0, height: y1 - y0, rx: 10, fill: COLORS.paper, stroke: COLORS.ink, "stroke-width": 2 }),
    text(en, { x: cx, y: y0 + 22, "text-anchor": "middle", "font-family": FONT, "font-size": 16, "font-weight": 700, fill: COLORS.ink }),
    text(ar, { x: cx, y: y0 + 42, direction: "rtl", "text-anchor": "middle", "font-family": FONT, "font-size": 14, fill: COLORS.muted }),
  ]);
}

/** Each floor's band outline in image pixels, ready to use as a facade hotspot. */
export function facadeBandPolygons(villa: VillaGeometry): { floorId: FloorId; points: [number, number][] }[] {
  const facade = buildFacadeGeometry(villa);
  const frame = facadeFrame(facade);
  return facade.bands.map((b) => ({ floorId: b.floorId, points: b.outline.map(frame.toPx) }));
}

function openingEl(frame: FacadeFrame, o: ElevationOpening): string {
  const [x, y] = frame.toPx([o.x, o.z + o.height]);
  const w = o.width * SCALE;
  const h = o.height * SCALE;
  if (o.kind === "door") return el("rect", { x, y, width: w, height: h, fill: COLORS.door, stroke: COLORS.ink, "stroke-width": 1.5 });
  return el("g", {}, [
    el("rect", { x, y, width: w, height: h, fill: COLORS.glass, stroke: COLORS.ink, "stroke-width": 1.5 }),
    el("line", { x1: x + w / 2, y1: y, x2: x + w / 2, y2: y + h, stroke: COLORS.ink, "stroke-width": 1 }),
  ]);
}

function bandEl(frame: FacadeFrame, band: FacadeBand, villa: VillaGeometry): string {
  const floor = villa.floors.find((f) => f.id === band.floorId)!;
  const [lx, ly] = frame.toPx(band.outline[0]);
  return el("g", { id: `floor-${band.floorId}` }, [
    el("polygon", { id: `band-${band.floorId}`, points: points(band.outline.map(frame.toPx)), fill: COLORS.band[band.floorId], stroke: COLORS.ink, "stroke-width": 2 }),
    ...band.openings.map((o) => openingEl(frame, o)),
    text(`${floor.title.en} · ${floor.title.ar}`, { x: lx + 8, y: ly + 18, "font-family": FONT, "font-size": 12, fill: COLORS.muted }),
  ]);
}

export function renderFacadeSvg(villa: VillaGeometry): string {
  const facade = buildFacadeGeometry(villa);
  const frame = facadeFrame(facade);
  const [, groundY] = frame.toPx([facade.left, 0]);
  const body = [
    el("rect", { x: 0, y: 0, width: frame.width, height: frame.height, fill: COLORS.paper }),
    el("rect", { x: 0, y: groundY, width: frame.width, height: 24, fill: COLORS.ground }),
    el("line", { x1: 0, y1: groundY, x2: frame.width, y2: groundY, stroke: COLORS.ink, "stroke-width": 2 }),
    ...facade.bands.map((b) => bandEl(frame, b, villa)),
    text("South elevation (courtyard side)", { x: SIDE, y: groundY + 60, "font-family": FONT, "font-size": 18, "font-weight": 700, fill: COLORS.ink }),
    text("الواجهة الجنوبية (جهة الحوش)", { x: SIDE, y: groundY + 86, "font-family": FONT, "font-size": 16, fill: COLORS.ink }),
    footerButtonEl("model-button", modelButtonPolygon(villa), "3D model", "نموذج ثلاثي الأبعاد"),
    footerButtonEl("turntable-button", turntableButtonPolygon(villa), "360° view", "عرض 360°"),
  ];
  return svgDocument(frame.width, frame.height, body, "Facade · الواجهة");
}
