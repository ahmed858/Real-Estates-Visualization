// The units table filter lives in the URL so a filtered list can be shared
// (`floors`, not `floor`: the scene view already uses ?floor= for the typical floor):
// ?status=available,reserved&type=Villa&beds=2,3&floors=0&price_min=…&price_max=…&area_min=…&area_max=…
import type { RangeFilter, UnitFilter } from "@/modules/domain";
import { UNIT_STATUSES, type UnitStatus } from "@/modules/schema";

export const FILTER_PARAMS = {
  status: "status",
  type: "type",
  bedrooms: "beds",
  floor: "floors",
  priceMin: "price_min",
  priceMax: "price_max",
  areaMin: "area_min",
  areaMax: "area_max",
} as const;

const list = (raw: string | null) => (raw ? raw.split(",").map((s) => s.trim()).filter(Boolean) : []);
const numbers = (raw: string | null) => list(raw).map(Number).filter(Number.isFinite);
const number = (raw: string | null) => {
  if (raw === null || raw.trim() === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
};
const range = (min: number | undefined, max: number | undefined): RangeFilter | undefined =>
  min === undefined && max === undefined ? undefined : { ...(min !== undefined && { min }), ...(max !== undefined && { max }) };

/** Reads the filter from a query string; unknown or malformed values are ignored. */
export function parseFilter(search: string | URLSearchParams): UnitFilter {
  const p = typeof search === "string" ? new URLSearchParams(search) : search;
  const filter: UnitFilter = {};
  const status = list(p.get(FILTER_PARAMS.status)).filter((s): s is UnitStatus => (UNIT_STATUSES as readonly string[]).includes(s));
  const type = list(p.get(FILTER_PARAMS.type));
  const bedrooms = numbers(p.get(FILTER_PARAMS.bedrooms));
  const floor = numbers(p.get(FILTER_PARAMS.floor));
  const price = range(number(p.get(FILTER_PARAMS.priceMin)), number(p.get(FILTER_PARAMS.priceMax)));
  const area = range(number(p.get(FILTER_PARAMS.areaMin)), number(p.get(FILTER_PARAMS.areaMax)));
  if (status.length) filter.status = status;
  if (type.length) filter.type = type;
  if (bedrooms.length) filter.bedrooms = bedrooms;
  if (floor.length) filter.floor = floor;
  if (price) filter.price = price;
  if (area) filter.area = area;
  return filter;
}

const join = (values: readonly (string | number)[] | undefined) => (values && values.length ? values.join(",") : null);
const num = (n: number | undefined) => (n === undefined ? null : String(n));

/** Every filter parameter with its value, or null to remove it from the URL. */
export function filterToParams(filter: UnitFilter): Record<string, string | null> {
  return {
    [FILTER_PARAMS.status]: join(filter.status),
    [FILTER_PARAMS.type]: join(filter.type),
    [FILTER_PARAMS.bedrooms]: join(filter.bedrooms),
    [FILTER_PARAMS.floor]: join(filter.floor),
    [FILTER_PARAMS.priceMin]: num(filter.price?.min),
    [FILTER_PARAMS.priceMax]: num(filter.price?.max),
    [FILTER_PARAMS.areaMin]: num(filter.area?.min),
    [FILTER_PARAMS.areaMax]: num(filter.area?.max),
  };
}

export const isEmptyFilter = (filter: UnitFilter) => Object.keys(filter).length === 0;
