"use client";
// "Filter" toggle in the scene view's navigation bar. It opens the same
// filter form as the units table; the stage then keeps matching hotspots
// coloured, dims the others and shows counts on scene hotspots.
import { filterUnits, type FilterableUnit } from "@/modules/domain";
import { useState } from "react";
import { viewerText, type ViewerLocale } from "../layout/viewer-text";
import { isEmptyFilter } from "../table/filter-params";
import { UnitFilterBar } from "../table/unit-filter-bar";
import { useUnitFilter } from "../table/use-unit-filter";

export interface SceneFilterProps {
  /** Every unit of the project; the filter options come from them. */
  units: readonly FilterableUnit[];
  locale: ViewerLocale;
}

export function SceneFilter({ units, locale }: SceneFilterProps) {
  const text = viewerText(locale);
  const { filter, update, clear } = useUnitFilter();
  const active = !isEmptyFilter(filter);
  const [open, setOpen] = useState(false);
  return (
    <div className="w-full">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`rounded-md border px-3 py-1 text-sm font-medium ${active ? "border-[var(--brand-accent,#e4c98f)] bg-[var(--brand-accent,#e4c98f)] text-[var(--brand-on-accent,#000000)] hover:opacity-90" : "border-white/30 text-white hover:bg-white/10"}`}
      >
        {active ? text.table.filters.toggleActive : text.table.filters.toggle}
      </button>
      {open && (
        <div className="mt-3 max-w-3xl">
          <UnitFilterBar units={units} filter={filter} onChange={update} onClear={clear} matching={filterUnits(units, filter).length} locale={locale} />
        </div>
      )}
    </div>
  );
}
