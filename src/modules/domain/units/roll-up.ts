// Which units each scene stands for: the units its own hotspots draw plus
// everything below it in the tree. A premium scene (3D, 360°) also stands for
// the units it lists in showsUnits and for everything below the scenes its
// hotspots open (a 3D building's floors are its siblings, not its children);
// one that still has none stands for its parent's units, being another view
// of the same place. Shared by the stats and the bedroom mix so both always
// count the same units.
import type { UnitRow } from "@/modules/schema";
import type { SceneTree } from "../scene-tree/scene-tree";

/**
 * Units per scene id, rolled up the tree. A unit drawn on two scenes appears
 * once per scene, and once on any ancestor shared by both. Sheet rows that no
 * hotspot draws are left out (the validator reports them).
 */
export function rollUpUnits(tree: SceneTree, units: readonly UnitRow[]): Map<string, UnitRow[]> {
  const byCode = new Map(units.map((u) => [u.code, u]));
  const codesOn = new Map<string, Set<string>>();
  for (const p of tree.placedUnits()) {
    if (!codesOn.has(p.sceneId)) codesOn.set(p.sceneId, new Set());
    codesOn.get(p.sceneId)?.add(p.code);
  }

  const result = new Map<string, UnitRow[]>();
  const toRows = (codes: Iterable<string>) =>
    [...codes].flatMap((code) => {
      const unit = byCode.get(code);
      return unit ? [unit] : [];
    });
  const below = new Map<string, Set<string>>();
  const subtree = (sceneId: string): Set<string> => {
    const codes = new Set(codesOn.get(sceneId) ?? []);
    for (const child of tree.children(sceneId)) for (const c of subtree(child.id)) codes.add(c);
    below.set(sceneId, codes);
    return codes;
  };
  subtree(tree.root.id);
  // Premium extras, then the parent fallback (parents first, so a fallback chain resolves).
  const finalCodes = new Map(below);
  for (const scene of tree.scenes) {
    if (scene.type === "image-2d") continue;
    const codes = new Set(below.get(scene.id));
    for (const code of scene.showsUnits ?? []) codes.add(code);
    for (const h of scene.hotspots) if ("scene" in h.target) for (const c of below.get(h.target.scene) ?? []) codes.add(c);
    finalCodes.set(scene.id, codes);
  }
  for (const scene of tree.scenes) {
    const parent = tree.parent(scene.id);
    if (scene.type !== "image-2d" && parent && finalCodes.get(scene.id)?.size === 0) finalCodes.set(scene.id, finalCodes.get(parent.id) ?? new Set());
  }
  for (const [sceneId, codes] of finalCodes) result.set(sceneId, toRows(codes));
  return result;
}
