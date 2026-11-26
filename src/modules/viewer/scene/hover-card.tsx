// Dark card shown over the scene while a hotspot is hovered or focused.
// A scene hotspot (e.g. a floor on the facade) shows the floor card: title,
// unit count, status chips, bedroom mix, area and price ranges and a hint to
// click. A unit hotspot shows the same style with the unit's own figures.
import type { BedroomCount, NumberRange } from "@/modules/domain";
import { UNIT_STATUSES, type UnitStatus } from "@/modules/schema";
import type { ViewerLocale, ViewerText } from "../layout/viewer-text";
import { STATUS_STYLE } from "./status-style";

/** Unit facts shown by the hover card and the side panel (a sheet row without its bookkeeping). */
export interface UnitSummary {
  code: string;
  type: string;
  floor: number;
  bedrooms: number;
  bathrooms: number;
  areaM2: number;
  price: number;
  status: UnitStatus;
  /** URL of the unit's plan image, when the sheet names one. */
  planImageUrl?: string;
  notes?: string;
}

/** Figures of a scene, rolled up the tree, as shown on its floor card. */
export interface SceneFigures {
  total: number;
  byStatus: Readonly<Record<UnitStatus, number>>;
  bedroomMix: readonly BedroomCount[];
  price: NumberRange | null;
  area: NumberRange | null;
}

export type HoverCardContent = { kind: "unit"; unit: UnitSummary } | { kind: "scene"; title: string; figures?: SceneFigures };

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

const CARD = "min-w-56 max-w-72 rounded-xl bg-zinc-950/90 p-4 text-sm text-zinc-100 shadow-2xl ring-1 ring-white/15 backdrop-blur";

function StatusChip({ status, label, count }: { status: UnitStatus; label: string; count?: string }) {
  return (
    <li data-count={status} className="flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-xs">
      <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_STYLE[status].color }} />
      <span>{label}</span>
      {count !== undefined && <span className="font-semibold tabular-nums">{count}</span>}
    </li>
  );
}

function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-zinc-400">{label}</dt>
          <dd className="font-medium tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function HoverCard({ content, text, locale, currency }: HoverCardProps) {
  const num = new Intl.NumberFormat(numberLocale(locale));
  const range = (r: NumberRange, f: (n: number) => string) => (r.min === r.max ? f(r.min) : `${f(r.min)} – ${f(r.max)}`);
  if (content.kind === "scene") {
    const { figures } = content;
    const rows: [string, string][] = [];
    if (figures?.area) rows.push([text.card.area, `${range(figures.area, (n) => num.format(n))} ${text.card.squareMetres}`]);
    if (figures?.price) rows.push([text.card.price, range(figures.price, (n) => formatPrice(n, currency, locale))]);
    return (
      <div role="tooltip" className={CARD}>
        <p className="text-base font-semibold">{content.title}</p>
        {figures && (
          <>
            <p className="text-zinc-400">{text.card.unitCount(num.format(figures.total), figures.total)}</p>
            <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={text.statusLegend}>
              {UNIT_STATUSES.map((s) => (
                <StatusChip key={s} status={s} label={text.status[s]} count={num.format(figures.byStatus[s])} />
              ))}
            </ul>
            {figures.bedroomMix.length > 0 && (
              <ul className="mt-3 space-y-0.5" aria-label={text.card.bedroomMix} data-testid="bedroom-mix">
                {figures.bedroomMix.map((b) => (
                  <li key={b.bedrooms}>{text.card.bedroomLine(num.format(b.bedrooms), num.format(b.units), b.units)}</li>
                ))}
              </ul>
            )}
            {rows.length > 0 && <Rows rows={rows} />}
          </>
        )}
        <p className="mt-3 text-xs text-[var(--brand-accent,#e4c98f)]">{text.card.openHint}</p>
      </div>
    );
  }
  const { unit } = content;
  return (
    <div role="tooltip" className={CARD}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-base font-semibold">
          {text.unit} {unit.code}
        </p>
        <ul>
          <StatusChip status={unit.status} label={text.status[unit.status]} />
        </ul>
      </div>
      <Rows
        rows={[
          [text.card.type, unit.type],
          [text.card.bedrooms, num.format(unit.bedrooms)],
          [text.card.area, `${num.format(unit.areaM2)} ${text.card.squareMetres}`],
          [text.card.price, formatPrice(unit.price, currency, locale)],
        ]}
      />
      <p className="mt-3 text-xs text-[var(--brand-accent,#e4c98f)]">{text.card.detailsHint}</p>
    </div>
  );
}
