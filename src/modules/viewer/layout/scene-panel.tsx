// Side panel content when no unit is selected: the scene's title and summary
// (units per status, price and area ranges, rolled up the tree).
import type { SceneStats } from "@/modules/domain";
import { UNIT_STATUSES } from "@/modules/schema";
import { formatPrice } from "../scene/hover-card";
import type { ViewerLocale, ViewerText } from "./viewer-text";

export interface ScenePanelProps {
  sceneTitle: string;
  text: ViewerText;
  /** Summary of the units in this scene and below it; omitted shows only the hint. */
  stats?: SceneStats;
  locale?: ViewerLocale;
  currency?: string;
  /** The project's address and map link; shown on the root scene only. */
  location?: SceneLocation;
}

export interface SceneLocation {
  address: string;
  /** Built with `mapsSearchUrl`; opens in a new tab. */
  mapsHref: string;
}

const numberLocale = (locale: ViewerLocale) => (locale === "ar" ? "ar-EG" : "en-US");

export function ScenePanel({ sceneTitle, text, stats, locale = "en", currency = "USD", location }: ScenePanelProps) {
  const num = new Intl.NumberFormat(numberLocale(locale));
  const rows: [string, string][] = [];
  if (stats && stats.total > 0) {
    rows.push([text.panel.units, num.format(stats.total)]);
    for (const s of UNIT_STATUSES) rows.push([text.status[s], num.format(stats.byStatus[s])]);
    if (stats.price) rows.push([text.panel.priceRange, `${formatPrice(stats.price.min, currency, locale)} – ${formatPrice(stats.price.max, currency, locale)}`]);
    if (stats.area) rows.push([text.panel.areaRange, `${num.format(stats.area.min)} – ${num.format(stats.area.max)} ${text.card.squareMetres}`]);
  }
  return (
    <section aria-label={text.details} className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/5 p-4">
      <h2 className="text-lg font-semibold">{sceneTitle}</h2>
      {rows.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-zinc-400">{label}</dt>
              <dd className="font-medium tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {location && (
        <div className="flex flex-col gap-1 border-t border-white/10 pt-2 text-sm">
          <h3 className="text-zinc-400">{text.panel.location}</h3>
          <address className="not-italic">{location.address}</address>
          <a
            href={location.mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="self-start font-medium text-[var(--brand-accent)] underline underline-offset-2"
          >
            {text.panel.openInMaps}
          </a>
        </div>
      )}
      <p className="text-sm text-zinc-400">{text.selectHint}</p>
    </section>
  );
}
