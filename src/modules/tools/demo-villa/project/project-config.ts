// Builds the demo villa's project.json: facade → 3 floors → 5 units. Hotspot
// polygons come straight from the geometry through the same frames the SVGs use.
import type { ProjectConfigInput, SceneInput } from "@/modules/schema";
import { buildFacadeGeometry } from "../facade/facade-geometry";
import { facadeBandPolygons, facadeFrame } from "../facade/facade-svg";
import type { FloorGeometry, Point, VillaGeometry } from "../geometry/types";
import { floorPlanFrame } from "../svg/frame";

export const DEMO_SLUG = "demo-villa";
export const facadeImagePath = "images/facade.svg";
export const floorImagePath = (floorId: string) => `images/floor-${floorId}.svg`;
export const LOGO_PATH = "images/logo.svg";

const px = (n: number) => Math.round(n * 100) / 100;
const pxPoint = ([x, y]: Point | [number, number]): [number, number] => [px(x), px(y)];

function floorScene(villa: VillaGeometry, floor: FloorGeometry): SceneInput {
  const frame = floorPlanFrame(villa);
  return {
    id: floor.id,
    kind: "floor",
    title: floor.title,
    image: { path: floorImagePath(floor.id), width: Math.round(frame.width), height: Math.round(frame.height) },
    hotspots: floor.units.map((u) => ({
      id: u.code.toLowerCase(),
      points: u.outline.map((p) => pxPoint(frame.toPx(p))),
      target: { unit: u.code },
    })),
  };
}

export function buildDemoVillaConfig(villa: VillaGeometry): ProjectConfigInput {
  const frame = facadeFrame(buildFacadeGeometry(villa));
  return {
    schemaVersion: 1,
    project: {
      slug: DEMO_SLUG,
      name: { ar: "فيلا الحوش", en: "Courtyard Villa" },
      defaultLocale: "ar",
      currency: "EGP",
      contact: { whatsapp: "+201000000000" },
      branding: { logo: LOGO_PATH, primaryColor: "#1a6b4f", accentColor: "#c89b3c" },
    },
    root: {
      id: "facade",
      kind: "facade",
      title: { ar: "الواجهة", en: "Facade" },
      image: { path: facadeImagePath, width: Math.round(frame.width), height: Math.round(frame.height) },
      hotspots: facadeBandPolygons(villa).map((b) => ({ id: b.floorId, points: b.points.map(pxPoint), target: { scene: b.floorId } })),
      children: villa.floors.map((f) => floorScene(villa, f)),
    },
  };
}
