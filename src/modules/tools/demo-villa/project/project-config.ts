// Builds the demo villa's project.json: facade → 3 floors → 5 units. Hotspot
// polygons come straight from the geometry through the same frames the SVGs use.
import type { ProjectConfigInput, SceneInput } from "@/modules/schema";
import { buildFacadeGeometry } from "../facade/facade-geometry";
import { rotationFramePath } from "@/modules/domain";
import { facadeBandPolygons, facadeFrame, modelButtonPolygon, turntableButtonPolygon } from "../facade/facade-svg";
import type { FloorGeometry, Point, VillaGeometry } from "../geometry/types";
import { floorPlanFrame } from "../svg/frame";
import { TURNTABLE_FRAMES, TURNTABLE_HEIGHT, TURNTABLE_WIDTH } from "../turntable/turntable-camera";
import { turntableUnitFrames } from "../turntable/turntable-svg";

export const DEMO_SLUG = "demo-villa";
export const facadeImagePath = "images/facade.svg";
export const floorImagePath = (floorId: string) => `images/floor-${floorId}.svg`;
export const LOGO_PATH = "images/logo.svg";
export const TURNTABLE_SCENE_ID = "turntable";
/** Poster of the turntable scene: a copy of its first frame. */
export const turntablePosterPath = "images/turntable.svg";
export const TURNTABLE_ROTATION = { frames: "rotations/turntable/frame-{index}.svg", count: TURNTABLE_FRAMES } as const;
export const turntableFramePath = (frame: number) => rotationFramePath(TURNTABLE_ROTATION, frame);
export const MODEL_SCENE_ID = "model";
export const MODEL_PATH = "models/villa.glb";

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

/** The turntable scene: the villa block turning, with the four apartments drawn on every frame where they show. */
function turntableScene(villa: VillaGeometry): SceneInput {
  return {
    id: TURNTABLE_SCENE_ID,
    kind: "other",
    type: "rotation-360",
    title: { ar: "عرض 360°", en: "360° view" },
    image: { path: turntablePosterPath, width: TURNTABLE_WIDTH, height: TURNTABLE_HEIGHT },
    rotation: { ...TURNTABLE_ROTATION, width: TURNTABLE_WIDTH, height: TURNTABLE_HEIGHT },
    hotspots: turntableUnitFrames(villa).map(({ code, frames }) => ({
      id: code.toLowerCase(),
      points: frames["1"],
      frames,
      target: { unit: code },
    })),
  };
}

/**
 * The 3D model scene: models/villa.glb with a hotspot per apartment mesh. Its
 * poster is the turntable's first frame, so each hotspot's poster polygon is
 * the apartment's outline on that frame.
 */
function modelScene(villa: VillaGeometry): SceneInput {
  return {
    id: MODEL_SCENE_ID,
    kind: "other",
    type: "model-3d",
    title: { ar: "نموذج ثلاثي الأبعاد", en: "3D model" },
    image: { path: turntablePosterPath, width: TURNTABLE_WIDTH, height: TURNTABLE_HEIGHT },
    model: { path: MODEL_PATH },
    hotspots: turntableUnitFrames(villa).map(({ code, frames }) => ({
      id: code.toLowerCase(),
      points: frames["1"],
      mesh: code,
      target: { unit: code },
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
      hotspots: [
        ...facadeBandPolygons(villa).map((b) => ({ id: b.floorId, points: b.points.map(pxPoint), target: { scene: b.floorId } })),
        { id: TURNTABLE_SCENE_ID, points: turntableButtonPolygon(villa).map(pxPoint), target: { scene: TURNTABLE_SCENE_ID } },
        { id: MODEL_SCENE_ID, points: modelButtonPolygon(villa).map(pxPoint), target: { scene: MODEL_SCENE_ID } },
      ],
      children: [...villa.floors.map((f) => floorScene(villa, f)), turntableScene(villa), modelScene(villa)],
    },
  };
}
