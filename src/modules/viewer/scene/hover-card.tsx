// Small card shown over the scene while a hotspot is hovered or focused:
// unit facts for a unit hotspot, title and status counts for a scene hotspot.
import { UNIT_STATUSES, type UnitStatus } from "@/modules/schema";
import type { ViewerLocale, ViewerText } from "../layout/viewer-text";

/** The unit facts the card needs (a subset of a sheet row, safe to send to the browser). */
export interface UnitSummary {
  code: string;
  type: string;
  bedrooms: number;
  areaM2: number;
  price: number;
  status: UnitStatus;
}

export type HoverCardContent =
  | { kind: "unit"; unit: UnitSummary }
  | { kind: "scene"; title: string; counts?: Readonly<Record<UnitStatus, number>> };

export interface HoverCardProps {
  content: HoverCardContent;
  text: ViewerText;
  locale: ViewerLocale;
  currency: string;
}

const numberLocale = (locale: ViewerLocale) => (locale === "ar" ? "ar-EG" : "en-US");

export function formatPrice(price: number, currency: string, locale: ViewerLocale): string {
  return new Intl.NumberFormat(numberLocale(locale), { style: "currency", currency, maximumFractionDigits: 0 }).format(price);
}

export function HoverCard({ content, text, locale, currency }: HoverCardProps) {
  const num = new Intl.NumberFormat(numberLocale(locale));
  if (content.kind === "scene") {
    return (
      <div role="tooltip" className="min-w-40 rounded-md bg-white p-3 text-sm text-zinc-900 shadow-lg ring-1 ring-zinc-200">
        <p className="font-semibold">{content.title}</p>
        {content.counts && (
          <dl className="mt-1 grid grid-cols-[auto_auto] gap-x-3">
            {UNIT_STATUSES.map((s) => (
              <div key={s} className="contents" data-count={s}>
                <dt>{text.status[s]}</dt>
                <dd className="font-semibold tabular-nums">{num.format(content.counts?.[s] ?? 0)}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    );
  }
  const { unit } = content;
  const rows: [string, string][] = [
    [text.card.type, unit.type],
    [text.card.bedrooms, num.format(unit.bedrooms)],
    [text.card.area, `${num.format(unit.areaM2)} ${text.card.squareMetres}`],
    [text.card.price, formatPrice(unit.price, currency, locale)],
    [text.card.status, text.status[unit.status]],
  ];
  return (
    <div role="tooltip" className="min-w-48 rounded-md bg-white p-3 text-sm text-zinc-900 shadow-lg ring-1 ring-zinc-200">
      <p className="font-semibold">
        {text.unit} {unit.code}
      </p>
      <dl className="mt-1 grid grid-cols-[auto_auto] gap-x-3">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-zinc-600">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
