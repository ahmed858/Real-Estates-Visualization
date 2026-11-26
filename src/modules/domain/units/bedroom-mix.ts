// How many units of each bedroom count a scene holds, rolled up the tree like
// the status counts (e.g. "2 bedrooms · 6 units").
import type { UnitRow } from "@/modules/schema";
import type { SceneTree } from "../scene-tree/scene-tree";
import { rollUpUnits } from "./roll-up";

export interface BedroomCount {
  bedrooms: number;
  units: number;
}

/** Bedroom counts of the given units, fewest bedrooms first. */
export function bedroomMixOf(units: readonly UnitRow[]): BedroomCount[] {
  const counts = new Map<number, number>();
  for (const u of units) counts.set(u.bedrooms, (counts.get(u.bedrooms) ?? 0) + 1);
  return [...counts].sort(([a], [b]) => a - b).map(([bedrooms, n]) => ({ bedrooms, units: n }));
}

/** Bedroom mix for every scene id; a scene without units gets an empty list. */
export function computeBedroomMix(tree: SceneTree, units: readonly UnitRow[]): Map<string, BedroomCount[]> {
  return new Map([...rollUpUnits(tree, units)].map(([id, list]) => [id, bedroomMixOf(list)]));
}
