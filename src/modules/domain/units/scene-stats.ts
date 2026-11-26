// Per-scene unit counts by status, price and area ranges, rolled up the scene tree.
import { UNIT_STATUSES, type UnitRow, type UnitStatus } from "@/modules/schema";
import type { SceneTree } from "../scene-tree/scene-tree";
import { extend, merge, type NumberRange } from "./range";
import { rollUpUnits } from "./roll-up";

export interface SceneStats {
  total: number;
  byStatus: Record<UnitStatus, number>;
  price: NumberRange | null;
  area: NumberRange | null;
}

const emptyStats = (): SceneStats => ({
  total: 0,
  byStatus: Object.fromEntries(UNIT_STATUSES.map((s) => [s, 0])) as Record<UnitStatus, number>,
  price: null,
  area: null,
});

function addUnit(stats: SceneStats, unit: UnitRow): void {
  stats.total += 1;
  stats.byStatus[unit.status] += 1;
  stats.price = extend(stats.price, unit.price);
  stats.area = extend(stats.area, unit.areaM2);
}

function addStats(into: SceneStats, from: SceneStats): void {
  into.total += from.total;
  for (const s of UNIT_STATUSES) into.byStatus[s] += from.byStatus[s];
  into.price = merge(into.price, from.price);
  into.area = merge(into.area, from.area);
}

/**
 * Stats for every scene. A scene counts the units its own hotspots draw plus
 * everything below it, so the root holds the whole project. A unit drawn on two
 * scenes counts once per scene, and once for any ancestor shared by both.
 * Sheet rows that no hotspot draws are ignored (the validator reports them).
 */
export function computeSceneStats(tree: SceneTree, units: readonly UnitRow[]): Map<string, SceneStats> {
  const result = new Map<string, SceneStats>();
  for (const [sceneId, list] of rollUpUnits(tree, units)) {
    const stats = emptyStats();
    for (const unit of list) addUnit(stats, unit);
    result.set(sceneId, stats);
  }
  return result;
}

/** Sums stats, e.g. for a custom group of scenes. */
export function sumStats(all: Iterable<SceneStats>): SceneStats {
  const total = emptyStats();
  for (const s of all) addStats(total, s);
  return total;
}
