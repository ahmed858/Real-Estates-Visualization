"use client";
// The units table with its filter bar. The filter is read from and written
// to the URL (see filter-params.ts) and applied with the domain filterUnits.
import Link from "next/link";
import { filterUnits } from "@/modules/domain";
import { COMPARE_PARAM, PICK_PARAM, parseCompareCodes, togglePicked, withCodes } from "../compare/compare-params";
import { viewerText } from "../layout/viewer-text";
import { setUrlParams, useUrlParam } from "../selection/use-selected-unit";
import { UnitFilterBar } from "./unit-filter-bar";
import { UnitsTable, type UnitsTableProps } from "./units-table";
import { useUnitFilter } from "./use-unit-filter";

export interface FilteredUnitsTableProps extends UnitsTableProps {
  /** The compare page, e.g. "/p/demo/compare?lang=en"; omitted hides picking. */
  compareBase?: string;
}

export function FilteredUnitsTable({ rows, currency, locale, compareBase }: FilteredUnitsTableProps) {
  const { filter, update, clear } = useUnitFilter();
  const pickedParam = useUrlParam(PICK_PARAM);
  const shown = filterUnits(rows, filter);
  const text = viewerText(locale);
  const picked = parseCompareCodes(pickedParam ?? undefined, new Set(rows.map((r) => r.code)));
  const picking = compareBase ? { picked, onToggle: (code: string) => setUrlParams({ [PICK_PARAM]: togglePicked(picked, code).join(",") || null }) } : undefined;
  const num = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US");
  return (
    <div className="flex flex-col gap-4">
      <UnitFilterBar units={rows} filter={filter} onChange={update} onClear={clear} matching={shown.length} locale={locale} />
      {compareBase && (
        <div className="flex items-center gap-3 text-sm" aria-live="polite">
          {picked.length >= 2 ? (
            <Link href={withCodes(compareBase, COMPARE_PARAM, picked)} className="rounded-md bg-[var(--brand-accent,#e4c98f)] px-3 py-1.5 font-medium text-[var(--brand-on-accent,#000000)] hover:opacity-90">
              {text.compare.open(num.format(picked.length))}
            </Link>
          ) : (
            <span className="text-zinc-400">{text.compare.hint}</span>
          )}
        </div>
      )}
      {shown.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-white/10 bg-white/5">
          <UnitsTable rows={shown} currency={currency} locale={locale} picking={picking} />
        </div>
      ) : (
        <p role="status" className="rounded-lg border border-white/10 bg-white/5 p-6 text-center text-zinc-300">
          {text.table.filters.empty}
        </p>
      )}
    </div>
  );
}
