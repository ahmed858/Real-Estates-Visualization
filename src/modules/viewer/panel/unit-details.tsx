// Side panel content for a selected unit: its facts, plan image and notes.
import { formatPrice, type UnitSummary } from "../scene/hover-card";
import type { ViewerLocale, ViewerText } from "../layout/viewer-text";

export interface UnitDetailsProps {
  unit: UnitSummary;
  text: ViewerText;
  locale: ViewerLocale;
  currency: string;
  onClose: () => void;
}

export function UnitDetails({ unit, text, locale, currency, onClose }: UnitDetailsProps) {
  const num = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US");
  const rows: [string, string][] = [
    [text.card.status, text.status[unit.status]],
    [text.card.type, unit.type],
    [text.panel.floor, num.format(unit.floor)],
    [text.card.bedrooms, num.format(unit.bedrooms)],
    [text.panel.bathrooms, num.format(unit.bathrooms)],
    [text.card.area, `${num.format(unit.areaM2)} ${text.card.squareMetres}`],
    [text.card.price, formatPrice(unit.price, currency, locale)],
  ];
  const title = `${text.unit} ${unit.code}`;
  return (
    <section aria-label={title} className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button type="button" onClick={onClose} className="rounded-md px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800">
          {text.panel.close}
        </button>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-zinc-600 dark:text-zinc-400">{label}</dt>
            <dd className="font-medium tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      {unit.planImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={unit.planImageUrl} alt={text.panel.plan(unit.code)} className="w-full rounded border border-zinc-200 bg-white dark:border-zinc-800" />
      )}
      {unit.notes && (
        <p className="text-sm">
          <span className="font-medium">{text.panel.notes}: </span>
          {unit.notes}
        </p>
      )}
    </section>
  );
}
