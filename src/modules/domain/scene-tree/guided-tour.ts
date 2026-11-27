// The path of the guided descent that follows the globe intro: from the root
// scene, through the hotspots a visitor would press (facade → floor → ...),
// to one unit worth showing, and into that unit's 360° view when it has one.
// Only image scenes are walked: their hotspots are what the zoom flies into.
import type { Scene, UnitStatus } from "@/modules/schema";
import type { SceneTree } from "./scene-tree";

export interface GuidedTour {
  /** Scene ids from the root to the scene that shows the unit, each opened by a hotspot of the one before. */
  scenes: string[];
  /** The unit the tour ends on and the hotspot that draws it on the last scene. */
  unit: { code: string; hotspotId: string; floor?: number };
  /** A premium scene (360° tour) that shows this unit, entered at the very end. */
  viewSceneId?: string;
}

interface Candidate {
  scenes: string[];
  unit: GuidedTour["unit"];
  score: number;
}

/** Available beats reserved beats sold; a unit with a 360° view beats one without. */
function scoreOf(status: UnitStatus | undefined, hasView: boolean): number {
  const byStatus = status === "available" ? 4 : status === "reserved" ? 2 : status === "sold" ? 1 : 0;
  return byStatus * 2 + (hasView ? 1 : 0);
}

/**
 * The best unit to end a guided tour on, and how to reach it, or undefined
 * when no unit is drawn on any image scene reachable from the root.
 * Among equal units the first in hotspot order wins, so the tour is stable.
 */
export function guidedTour(tree: SceneTree, units: readonly { code: string; status: UnitStatus }[]): GuidedTour | undefined {
  const status = new Map(units.map((u) => [u.code, u.status]));
  const views = (code: string) => tree.scenes.find((s) => s.type !== "image-2d" && s.showsUnits?.includes(code));
  let best: Candidate | undefined;
  const consider = (c: Candidate) => {
    if (!best || c.score > best.score) best = c;
  };
  const visit = (scene: Scene, path: string[]) => {
    if (scene.type !== "image-2d" || path.includes(scene.id)) return;
    const here = [...path, scene.id];
    const floors = tree.concreteFloors(scene.id);
    const placed = floors.length > 0 ? floors.flatMap((f) => f.units) : scene.hotspots.flatMap((h) => ("unit" in h.target ? [{ code: h.target.unit, hotspotId: h.id, floor: undefined }] : []));
    for (const p of placed) consider({ scenes: here, unit: { code: p.code, hotspotId: p.hotspotId, ...(p.floor !== undefined && { floor: p.floor }) }, score: scoreOf(status.get(p.code), !!views(p.code)) });
    for (const h of scene.hotspots) if ("scene" in h.target && tree.has(h.target.scene)) visit(tree.get(h.target.scene), here);
  };
  visit(tree.root, []);
  const found = best as Candidate | undefined;
  if (!found) return undefined;
  const view = views(found.unit.code);
  return { scenes: found.scenes, unit: found.unit, ...(view && { viewSceneId: view.id }) };
}

/** What the tour does next on a scene: zoom into a hotspot that opens a scene, show the unit, or nothing (off the path). */
export type GuidedTourStep =
  | { kind: "scene"; hotspotId: string; sceneId: string }
  | { kind: "unit"; hotspotId: string; code: string; floor?: number; viewSceneId?: string };

export function guidedTourStep(tree: SceneTree, tour: GuidedTour, sceneId: string): GuidedTourStep | undefined {
  const at = tour.scenes.indexOf(sceneId);
  if (at < 0) return undefined;
  const next = tour.scenes[at + 1];
  if (next === undefined) return { kind: "unit", hotspotId: tour.unit.hotspotId, code: tour.unit.code, ...(tour.unit.floor !== undefined && { floor: tour.unit.floor }), ...(tour.viewSceneId && { viewSceneId: tour.viewSceneId }) };
  const hotspot = tree.get(sceneId).hotspots.find((h) => "scene" in h.target && h.target.scene === next);
  return hotspot ? { kind: "scene", hotspotId: hotspot.id, sceneId: next } : undefined;
}
