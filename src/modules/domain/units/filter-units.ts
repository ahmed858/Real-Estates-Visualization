// Pure unit filter for the units table and the viewer.
import type { UnitRow, UnitStatus } from "@/modules/schema";

export interface RangeFilter {
  min?: number;
  max?: number;
}

/** Every field is optional; an empty list or missing field means "any". Fields combine with AND. */
export interface UnitFilter {
  status?: readonly UnitStatus[];
  type?: readonly string[];
  bedrooms?: readonly number[];
  floor?: readonly number[];
  price?: RangeFilter;
  area?: RangeFilter;
}

const inList = <T>(list: readonly T[] | undefined, value: T) => !list || list.length === 0 || list.includes(value);
const inRange = (range: RangeFilter | undefined, value: number) =>
  !range || ((range.min === undefined || value >= range.min) && (range.max === undefined || value <= range.max));
const normaliseType = (t: string) => t.trim().toLowerCase();

/** True when a unit matches every criterion of the filter. Type matching ignores case and spaces at the ends. */
export function matchesFilter(unit: UnitRow, filter: UnitFilter): boolean {
  return (
    inList(filter.status, unit.status) &&
    inList(filter.type?.map(normaliseType), normaliseType(unit.type)) &&
    inList(filter.bedrooms, unit.bedrooms) &&
    inList(filter.floor, unit.floor) &&
    inRange(filter.price, unit.price) &&
    inRange(filter.area, unit.areaM2)
  );
}

/** Units matching the filter, in their original order. */
export function filterUnits(units: readonly UnitRow[], filter: UnitFilter): UnitRow[] {
  return units.filter((u) => matchesFilter(u, filter));
}
