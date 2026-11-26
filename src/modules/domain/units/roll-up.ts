// Which units each scene stands for: the units its own hotspots draw plus
// everything below it in the tree. Shared by the stats and the bedroom mix so
// both always count the same units.
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
  const subtreeCodes = (sceneId: string): Set<string> => {
    const codes = new Set(codesOn.get(sceneId) ?? []);
    for (const child of tree.children(sceneId)) for (const c of subtreeCodes(child.id)) codes.add(c);
    result.set(
      sceneId,
      [...codes].flatMap((code) => {
        const unit = byCode.get(code);
        return unit ? [unit] : [];
      }),
    );
    return codes;
  };
  subtreeCodes(tree.root.id);
  return result;
}
