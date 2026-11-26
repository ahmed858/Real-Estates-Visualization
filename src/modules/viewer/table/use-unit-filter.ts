"use client";
// The units filter as it reads in the URL, with setters that write it back.
import type { UnitFilter } from "@/modules/domain";
import { setUrlParams, useUrlSearch } from "../selection/use-selected-unit";
import { filterToParams, parseFilter } from "./filter-params";

const isBlank = (v: UnitFilter[keyof UnitFilter]) => v === undefined || (Array.isArray(v) ? v.length === 0 : Object.keys(v as object).length === 0);

export function useUnitFilter() {
  const filter = parseFilter(useUrlSearch());
  const update = (patch: Partial<UnitFilter>) => {
    const next: UnitFilter = { ...filter, ...patch };
    for (const key of Object.keys(patch) as (keyof UnitFilter)[]) if (isBlank(next[key])) delete next[key];
    setUrlParams(filterToParams(next));
  };
  const clear = () => setUrlParams(filterToParams({}));
  return { filter, update, clear };
}
