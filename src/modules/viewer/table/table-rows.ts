// Rows of the units table: every unit a hotspot draws (typical floors
// expanded), joined with its sheet row, linked to the scene that draws it.
import type { SceneTree } from "@/modules/domain";
import type { UnitRow } from "@/modules/schema";
import type { UnitTableRow } from "./units-table";

/** Builds the link of a unit on a scene; `floor` is set for units on a typical floor. */
export type UnitHref = (sceneId: string, code: string, floor?: number) => string;

/**
 * One row per unit code, in tree order. A unit drawn on several scenes links
 * to the first (topmost) one. Sheet rows no hotspot draws are left out, like
 * in the scene stats (the validator reports them).
 */
export function unitTableRows(tree: SceneTree, units: readonly UnitRow[], hrefOf: UnitHref): UnitTableRow[] {
  const byCode = new Map(units.map((u) => [u.code, u]));
  const seen = new Set<string>();
  const rows: UnitTableRow[] = [];
  for (const placed of tree.placedUnits()) {
    const unit = byCode.get(placed.code);
    if (!unit || seen.has(placed.code)) continue;
    seen.add(placed.code);
    const { code, type, floor, bedrooms, bathrooms, areaM2, price, status } = unit;
    rows.push({ code, type, floor, bedrooms, bathrooms, areaM2, price, status, href: hrefOf(placed.sceneId, code, placed.floor) });
  }
  return rows;
}
