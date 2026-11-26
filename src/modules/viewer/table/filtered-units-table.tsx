"use client";
// The units table with its filter bar. The filter is read from and written
// to the URL (see filter-params.ts) and applied with the domain filterUnits.
import { filterUnits } from "@/modules/domain";
import { viewerText } from "../layout/viewer-text";
import { UnitFilterBar } from "./unit-filter-bar";
import { UnitsTable, type UnitsTableProps } from "./units-table";
import { useUnitFilter } from "./use-unit-filter";

export function FilteredUnitsTable({ rows, currency, locale }: UnitsTableProps) {
  const { filter, update, clear } = useUnitFilter();
  const shown = filterUnits(rows, filter);
  return (
    <div className="flex flex-col gap-4">
      <UnitFilterBar units={rows} filter={filter} onChange={update} onClear={clear} matching={shown.length} locale={locale} />
      {shown.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-white/10 bg-white/5">
          <UnitsTable rows={shown} currency={currency} locale={locale} />
        </div>
      ) : (
        <p role="status" className="rounded-lg border border-white/10 bg-white/5 p-6 text-center text-zinc-300">
          {viewerText(locale).table.filters.empty}
        </p>
      )}
    </div>
  );
}
