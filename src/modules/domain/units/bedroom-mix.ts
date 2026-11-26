// Bedroom mix per scene ("2 bedrooms · 6 units"), rolled up the scene tree the
// same way as the status stats.
import type { UnitRow } from "@/modules/schema";
import type { SceneTree } from "../scene-tree/scene-tree";
import { unitsBySubtree } from "./scene-stats";

export interface BedroomCount {
  bedrooms: number;
  units: number;
}

/** Units per bedroom count, fewest bedrooms first; only counts that occur are listed. */
export function bedroomMixOf(units: readonly Pick<UnitRow, "bedrooms">[]): BedroomCount[] {
  const counts = new Map<number, number>();
  for (const u of units) counts.set(u.bedrooms, (counts.get(u.bedrooms) ?? 0) + 1);
  return [...counts].sort(([a], [b]) => a - b).map(([bedrooms, n]) => ({ bedrooms, units: n }));
}

/** Bedroom mix for every scene: its own units plus everything below it. */
export function computeBedroomMix(tree: SceneTree, units: readonly UnitRow[]): Map<string, BedroomCount[]> {
  return new Map([...unitsBySubtree(tree, units)].map(([sceneId, rows]) => [sceneId, bedroomMixOf(rows)]));
}
