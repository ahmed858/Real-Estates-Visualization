// Sorting for the units table: one comparator per column, stable, with the
// unit code as the tie breaker so equal values keep a predictable order.
import { UNIT_STATUSES } from "@/modules/schema";
import type { UnitSummary } from "../scene/hover-card";

export const UNIT_SORT_KEYS = ["code", "floor", "type", "bedrooms", "areaM2", "price", "status"] as const;
export type UnitSortKey = (typeof UNIT_SORT_KEYS)[number];
export type SortDirection = "asc" | "desc";

const byText = (a: string, b: string) => a.localeCompare(b, "en", { numeric: true, sensitivity: "base" });

const COMPARE: Record<UnitSortKey, (a: UnitSummary, b: UnitSummary) => number> = {
  code: (a, b) => byText(a.code, b.code),
  floor: (a, b) => a.floor - b.floor,
  type: (a, b) => byText(a.type, b.type),
  bedrooms: (a, b) => a.bedrooms - b.bedrooms,
  areaM2: (a, b) => a.areaM2 - b.areaM2,
  price: (a, b) => a.price - b.price,
  // Legend order: available, reserved, sold.
  status: (a, b) => UNIT_STATUSES.indexOf(a.status) - UNIT_STATUSES.indexOf(b.status),
};

/** A sorted copy of the rows. */
export function sortUnits<T extends UnitSummary>(rows: readonly T[], key: UnitSortKey, direction: SortDirection): T[] {
  const sign = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => sign * COMPARE[key](a, b) || COMPARE.code(a, b));
}
