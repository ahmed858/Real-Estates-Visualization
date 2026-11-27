"use client";
// Every unit of the project in one sortable table. A column header toggles
// the sort (ascending first, then descending); a row links to the unit on
// its scene. Status is shown with the same swatch as the legend.
import Link from "next/link";
import { useState } from "react";
import type { ViewerLocale } from "../layout/viewer-text";
import { viewerText } from "../layout/viewer-text";
import { StatusSwatch } from "../layout/status-legend";
import { formatPrice, type UnitSummary } from "../scene/hover-card";
import { MAX_COMPARED } from "../compare/compare-params";
import { sortUnits, UNIT_SORT_KEYS, type SortDirection, type UnitSortKey } from "./sort-units";

export interface UnitTableRow extends UnitSummary {
  /** The unit on its scene, e.g. "/p/demo/ground?unit=G-01". */
  href: string;
}

export interface UnitsTableProps {
  rows: readonly UnitTableRow[];
  currency: string;
  locale: ViewerLocale;
}

export interface UnitPicking {
  /** Codes picked for comparing; adds a checkbox column. */
  picked: readonly string[];
  onToggle: (code: string) => void;
}

export function UnitsTable({ rows, currency, locale, picking }: UnitsTableProps & { picking?: UnitPicking }) {
  const text = viewerText(locale);
  const [sort, setSort] = useState<{ key: UnitSortKey; direction: SortDirection }>({ key: "code", direction: "asc" });
  const num = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US");
  const sorted = sortUnits(rows, sort.key, sort.direction);
  const toggle = (key: UnitSortKey) =>
    setSort((s) => (s.key === key ? { key, direction: s.direction === "asc" ? "desc" : "asc" } : { key, direction: "asc" }));
  const cell = "px-3 py-2 text-start";
  return (
    <table className="w-full border-collapse text-sm">
      <caption className="sr-only">{text.table.title}</caption>
      <thead>
        <tr className="border-b border-white/15 text-zinc-400">
          {picking && (
            <td className={cell}>
              <span className="sr-only">{text.compare.title}</span>
            </td>
          )}
          {UNIT_SORT_KEYS.map((key) => {
            const active = sort.key === key;
            return (
              <th key={key} scope="col" className={cell} aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}>
                <button type="button" onClick={() => toggle(key)} className="inline-flex items-center gap-1 font-medium hover:text-white">
                  {text.table.columns[key]}
                  <span aria-hidden="true" className={active ? "text-white" : "opacity-30"}>
                    {active && sort.direction === "desc" ? "▼" : "▲"}
                  </span>
                </button>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {sorted.map((u) => (
          <tr key={u.code} data-unit={u.code} className="border-b border-white/5 hover:bg-white/5">
            {picking && (
              <td className={cell}>
                <input
                  type="checkbox"
                  aria-label={text.compare.pick(u.code)}
                  checked={picking.picked.includes(u.code)}
                  disabled={!picking.picked.includes(u.code) && picking.picked.length >= MAX_COMPARED}
                  onChange={() => picking.onToggle(u.code)}
                  className="size-4 accent-[var(--brand-accent,#e4c98f)] disabled:opacity-30"
                />
              </td>
            )}
            <td className={cell}>
              <Link href={u.href} className="font-semibold text-white underline-offset-2 hover:underline">
                {u.code}
              </Link>
            </td>
            <td className={`${cell} tabular-nums`}>{num.format(u.floor)}</td>
            <td className={cell}>{u.type}</td>
            <td className={`${cell} tabular-nums`}>{num.format(u.bedrooms)}</td>
            <td className={`${cell} tabular-nums`}>
              {num.format(u.areaM2)} {text.card.squareMetres}
            </td>
            <td className={`${cell} tabular-nums`}>{formatPrice(u.price, currency, locale)}</td>
            <td className={cell}>
              <span className="inline-flex items-center gap-2" data-status={u.status}>
                <StatusSwatch status={u.status} />
                {text.status[u.status]}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
