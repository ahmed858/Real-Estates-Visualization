"use client";
// Filter form for units: status, and type / bedrooms / floor built from the
// values in the data, plus price and area ranges. A controlled view of the
// filter in the URL (see useUnitFilter); used by the units table and the scene view.
import type { FilterableUnit, RangeFilter, UnitFilter } from "@/modules/domain";
import { UNIT_STATUSES } from "@/modules/schema";
import { useId } from "react";
import type { ViewerLocale } from "../layout/viewer-text";
import { viewerText } from "../layout/viewer-text";
import { isEmptyFilter } from "./filter-params";

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

export interface UnitFilterBarProps {
  /** The units the options come from (e.g. every unit of the project). */
  units: readonly FilterableUnit[];
  filter: UnitFilter;
  onChange: (patch: Partial<UnitFilter>) => void;
  onClear: () => void;
  /** How many units match, shown as "N of M units". */
  matching: number;
  locale: ViewerLocale;
}

export function UnitFilterBar({ units, filter, onChange, onClear, matching, locale }: UnitFilterBarProps) {
  const text = viewerText(locale);
  const t = text.table.filters;
  const num = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US");
  return (
    <form role="search" aria-label={t.label} className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-4 text-sm" onSubmit={(e) => e.preventDefault()}>
      <Group legend={text.table.columns.status} options={UNIT_STATUSES} selected={filter.status} label={(s) => text.status[s]} onToggle={(s) => onChange({ status: toggle(filter.status, s) })} />
      <Group legend={text.table.columns.type} options={distinct(units.map((r) => r.type))} selected={filter.type} label={(v) => v} onToggle={(v) => onChange({ type: toggle(filter.type, v) })} />
      <Group legend={text.table.columns.bedrooms} options={distinct(units.map((r) => r.bedrooms))} selected={filter.bedrooms} label={(v) => num.format(v)} onToggle={(v) => onChange({ bedrooms: toggle(filter.bedrooms, v) })} />
      <Group legend={text.table.columns.floor} options={distinct(units.map((r) => r.floor))} selected={filter.floor} label={(v) => num.format(v)} onToggle={(v) => onChange({ floor: toggle(filter.floor, v) })} />
      <div className="flex flex-wrap gap-6">
        <RangeInputs legend={text.table.columns.price} value={filter.price} min={t.min} max={t.max} onChange={(price) => onChange({ price })} />
        <RangeInputs legend={`${text.table.columns.areaM2} (${text.card.squareMetres})`} value={filter.area} min={t.min} max={t.max} onChange={(area) => onChange({ area })} />
      </div>
      <div className="flex items-center justify-between gap-4">
        <p aria-live="polite" className="text-zinc-400">
          {t.count(num.format(matching), num.format(units.length))}
        </p>
        <button type="button" disabled={isEmptyFilter(filter)} onClick={onClear} className="rounded-md border border-white/20 px-3 py-1 hover:bg-white/10 disabled:opacity-40">
          {t.clear}
        </button>
      </div>
    </form>
  );
}
