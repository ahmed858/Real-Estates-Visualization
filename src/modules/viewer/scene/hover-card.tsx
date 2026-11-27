// Dark card shown over the scene while a hotspot is hovered or focused. For a
// scene hotspot (e.g. a floor on the facade) it shows the floor card: title,
// unit count, status chips, bedroom mix, area and price ranges and a hint to
// open it. For a unit hotspot it shows the unit's own figures in the same style.
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
  /** URLs of the unit's photos, from the sheet's gallery column. */
  galleryUrls?: string[];
  notes?: string;
  /** 360° tours of this unit's type (premium scenes whose showsUnits lists it). */
  tours?: { title: string; href: string }[];
}

interface Range {
  min: number;
  max: number;
}

/** What a scene holds, rolled up the tree: shown on the floor card. Plain data, so a server page can pass it. */
export interface SceneSummary {
  total: number;
  byStatus: Readonly<Record<UnitStatus, number>>;
  /** Units per bedroom count, fewest bedrooms first. */
  bedroomMix: readonly { bedrooms: number; units: number }[];
  price: Range | null;
  area: Range | null;
}

export type HoverCardContent = { kind: "unit"; unit: UnitSummary } | { kind: "scene"; title: string; summary?: SceneSummary };

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

/** "a – b", or a single value when both ends agree. */
const formatRange = (r: Range, format: (n: number) => string) => (r.min === r.max ? format(r.min) : `${format(r.min)} – ${format(r.max)}`);

const CARD = "min-w-56 max-w-72 rounded-xl bg-zinc-950/90 p-4 text-sm text-zinc-100 shadow-2xl ring-1 ring-white/10 backdrop-blur-md";

function StatusChip({ status, label, value }: { status: UnitStatus; label: string; value?: string }) {
  return (
    <li data-chip={status} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-xs">
      <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: STATUS_STYLE[status].color, boxShadow: `0 0 6px ${STATUS_STYLE[status].color}` }} />
      <span>{label}</span>
      {value !== undefined && <span className="font-semibold tabular-nums">{value}</span>}
    </li>
  );
}

function Facts({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-zinc-400">{label}</dt>
          <dd className="text-end font-medium tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function HoverCard({ content, text, locale, currency }: HoverCardProps) {
  const num = new Intl.NumberFormat(numberLocale(locale));
  const area = (n: number) => `${num.format(n)} ${text.card.squareMetres}`;
  const price = (n: number) => formatPrice(n, currency, locale);

  if (content.kind === "scene") {
    const { summary } = content;
    const rows: [string, string][] = [];
    if (summary?.area) rows.push([text.panel.areaRange, formatRange(summary.area, area)]);
    if (summary?.price) rows.push([text.panel.priceRange, formatRange(summary.price, price)]);
    return (
      <div role="tooltip" className={CARD}>
        <p className="text-base font-semibold">{content.title}</p>
        {summary && (
          <>
            <p className="text-zinc-400" data-testid="card-total">
              {text.card.unitCount(summary.total, num.format(summary.total))}
            </p>
            <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={text.statusLegend}>
              {UNIT_STATUSES.map((s) => (
                <StatusChip key={s} status={s} label={text.status[s]} value={num.format(summary.byStatus[s])} />
              ))}
            </ul>
            {summary.bedroomMix.length > 0 && (
              <ul className="mt-3 space-y-0.5" aria-label={text.card.bedroomMix} data-testid="bedroom-mix">
                {summary.bedroomMix.map((m) => (
                  <li key={m.bedrooms}>
                    {text.card.bedroomCount(m.bedrooms, num.format(m.bedrooms))} · {text.card.unitCount(m.units, num.format(m.units))}
                  </li>
                ))}
              </ul>
            )}
            {rows.length > 0 && <Facts rows={rows} />}
          </>
        )}
        <p className="mt-3 text-xs text-[color:var(--brand-accent,#e9c46a)]">{text.card.openHint}</p>
      </div>
    );
  }

  const { unit } = content;
  return (
    <div role="tooltip" className={CARD}>
      <p className="text-base font-semibold">
        {text.unit} {unit.code}
      </p>
      <ul className="mt-2 flex">
        <StatusChip status={unit.status} label={text.status[unit.status]} />
      </ul>
      <Facts
        rows={[
          [text.card.type, unit.type],
          [text.card.bedrooms, num.format(unit.bedrooms)],
          [text.card.area, area(unit.areaM2)],
          [text.card.price, price(unit.price)],
        ]}
      />
    </div>
  );
}
