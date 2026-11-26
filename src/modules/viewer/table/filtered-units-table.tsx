"use client";
// The units table with its filter bar. The filter is read from and written
// to the URL (see filter-params.ts) and applied with the domain filterUnits.
import { filterUnits, type RangeFilter, type UnitFilter } from "@/modules/domain";
import { UNIT_STATUSES } from "@/modules/schema";
import { useId } from "react";
import { viewerText } from "../layout/viewer-text";
import { setUrlParams, useUrlSearch } from "../selection/use-selected-unit";
import { filterToParams, isEmptyFilter, parseFilter } from "./filter-params";
import { UnitsTable, type UnitsTableProps } from "./units-table";

const distinct = <T,>(values: T[]) => [...new Set(values)].sort((a, b) => (typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b))));

function toggle<T>(list: readonly T[] | undefined, value: T): T[] {
  const current = list ?? [];
  return current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
}

function Group<T extends string | number>({ legend, options, selected, label, onToggle }: { legend: string; options: readonly T[]; selected: readonly T[] | undefined; label: (v: T) => string; onToggle: (v: T) => void }) {
  return (
    <fieldset className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <legend className="me-2 text-zinc-400">{legend}</legend>
      {options.map((o) => (
        <label key={String(o)} className="inline-flex items-center gap-1.5">
          <input type="checkbox" checked={selected?.includes(o) ?? false} onChange={() => onToggle(o)} className="accent-[var(--brand-accent,#e4c98f)]" />
          {label(o)}
        </label>
      ))}
    </fieldset>
  );
}

function RangeInputs({ legend, value, min, max, onChange }: { legend: string; value: RangeFilter | undefined; min: string; max: string; onChange: (r: RangeFilter) => void }) {
  const id = useId();
  const set = (side: "min" | "max", raw: string) => {
    const next: RangeFilter = { ...value };
    if (raw.trim() === "" || !Number.isFinite(Number(raw))) delete next[side];
    else next[side] = Number(raw);
    onChange(next);
  };
  const input = "w-28 rounded-md border border-white/20 bg-zinc-900/80 px-2 py-1 text-zinc-100";
  return (
    <fieldset className="flex items-center gap-2">
      <legend className="me-2 text-zinc-400">{legend}</legend>
      <label htmlFor={`${id}-min`} className="sr-only">{`${legend} ${min}`}</label>
      <input id={`${id}-min`} type="number" inputMode="numeric" placeholder={min} value={value?.min ?? ""} onChange={(e) => set("min", e.target.value)} className={input} />
      <span aria-hidden="true">–</span>
      <label htmlFor={`${id}-max`} className="sr-only">{`${legend} ${max}`}</label>
      <input id={`${id}-max`} type="number" inputMode="numeric" placeholder={max} value={value?.max ?? ""} onChange={(e) => set("max", e.target.value)} className={input} />
    </fieldset>
  );
}

export function FilteredUnitsTable({ rows, currency, locale }: UnitsTableProps) {
  const text = viewerText(locale);
  const t = text.table.filters;
  const num = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US");
  const filter = parseFilter(useUrlSearch());
  const update = (patch: Partial<UnitFilter>) => {
    const next: UnitFilter = { ...filter, ...patch };
    for (const key of Object.keys(patch) as (keyof UnitFilter)[]) {
      const v = next[key];
      if (v === undefined || (Array.isArray(v) && v.length === 0) || (!Array.isArray(v) && typeof v === "object" && Object.keys(v).length === 0)) delete next[key];
    }
    setUrlParams(filterToParams(next));
  };
  const shown = filterUnits(rows, filter);
  return (
    <div className="flex flex-col gap-4">
      <form role="search" aria-label={t.label} className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-4 text-sm" onSubmit={(e) => e.preventDefault()}>
        <Group legend={text.table.columns.status} options={UNIT_STATUSES} selected={filter.status} label={(s) => text.status[s]} onToggle={(s) => update({ status: toggle(filter.status, s) })} />
        <Group legend={text.table.columns.type} options={distinct(rows.map((r) => r.type))} selected={filter.type} label={(v) => v} onToggle={(v) => update({ type: toggle(filter.type, v) })} />
        <Group legend={text.table.columns.bedrooms} options={distinct(rows.map((r) => r.bedrooms))} selected={filter.bedrooms} label={(v) => num.format(v)} onToggle={(v) => update({ bedrooms: toggle(filter.bedrooms, v) })} />
        <Group legend={text.table.columns.floor} options={distinct(rows.map((r) => r.floor))} selected={filter.floor} label={(v) => num.format(v)} onToggle={(v) => update({ floor: toggle(filter.floor, v) })} />
        <div className="flex flex-wrap gap-6">
          <RangeInputs legend={text.table.columns.price} value={filter.price} min={t.min} max={t.max} onChange={(price) => update({ price })} />
          <RangeInputs legend={`${text.table.columns.areaM2} (${text.card.squareMetres})`} value={filter.area} min={t.min} max={t.max} onChange={(area) => update({ area })} />
        </div>
        <div className="flex items-center justify-between gap-4">
          <p aria-live="polite" className="text-zinc-400">
            {t.count(num.format(shown.length), num.format(rows.length))}
          </p>
          <button type="button" disabled={isEmptyFilter(filter)} onClick={() => setUrlParams(filterToParams({}))} className="rounded-md border border-white/20 px-3 py-1 hover:bg-white/10 disabled:opacity-40">
            {t.clear}
          </button>
        </div>
      </form>
      {shown.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-white/10 bg-white/5">
          <UnitsTable rows={shown} currency={currency} locale={locale} />
        </div>
      ) : (
        <p role="status" className="rounded-lg border border-white/10 bg-white/5 p-6 text-center text-zinc-300">
          {t.empty}
        </p>
      )}
    </div>
  );
}
