// Which premium views (3D model, 360° rotation, 360° panorama) to offer as
// shortcuts on a scene, for projects whose scene image has no hotspot for
// them (a photo facade cannot carry a "3D" button the way a drawn one can).
import type { Scene } from "@/modules/schema";
import type { SceneTree } from "./scene-tree";

const isPremium = (s: Scene) => s.type !== "image-2d";

/**
 * The premium children of the scene, and while a premium scene is open its
 * premium siblings too (to jump from the 3D model to a panorama), in tree
 * order. Scenes a hotspot of this scene already opens are left out.
 */
export function premiumViews(tree: SceneTree, sceneId: string): Scene[] {
  const scene = tree.get(sceneId);
  const linked = new Set(scene.hotspots.flatMap((h) => ("scene" in h.target ? [h.target.scene] : [])));
  const parent = tree.parent(sceneId);
  const candidates = [...tree.children(sceneId), ...(isPremium(scene) && parent ? tree.children(parent.id) : [])];
  const seen = new Set<string>();
  return candidates.filter((s) => {
    if (!isPremium(s) || linked.has(s.id) || seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });
}
