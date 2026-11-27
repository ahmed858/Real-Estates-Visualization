// Up to three units side by side: one column per unit, one row per fact,
// each unit linking to its place on the plan, with its plan image and a
// WhatsApp enquiry. Plain data in, no state.
import Link from "next/link";
import type { ReactNode } from "react";
import { StatusSwatch } from "../layout/status-legend";
import type { ViewerLocale } from "../layout/viewer-text";
import { viewerText } from "../layout/viewer-text";
import { formatPrice } from "../scene/hover-card";
import type { UnitTableRow } from "../table/units-table";
import { WhatsAppButton } from "../contact/whatsapp-button";

export interface CompareUnit extends UnitTableRow {
  /** Title of the scene that draws the unit. */
  sceneTitle: string;
  planImageUrl?: string;
  /** WhatsApp link for an enquiry about this unit; omitted hides the button. */
  enquiryHref?: string;
}

export interface CompareTableProps {
  units: readonly CompareUnit[];
  currency: string;
  locale: ViewerLocale;
}

export function CompareTable({ units, currency, locale }: CompareTableProps) {
  const text = viewerText(locale);
  const num = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US");
  const facts: [string, (u: CompareUnit) => ReactNode][] = [
    [text.compare.scene, (u) => u.sceneTitle],
    [text.card.status, (u) => (
      <span className="inline-flex items-center gap-2" data-status={u.status}>
        <StatusSwatch status={u.status} />
        {text.status[u.status]}
      </span>
    )],
    [text.card.type, (u) => u.type],
    [text.panel.floor, (u) => num.format(u.floor)],
    [text.card.bedrooms, (u) => num.format(u.bedrooms)],
    [text.panel.bathrooms, (u) => num.format(u.bathrooms)],
    [text.card.area, (u) => `${num.format(u.areaM2)} ${text.card.squareMetres}`],
    [text.card.price, (u) => formatPrice(u.price, currency, locale)],
  ];
  const cell = "px-3 py-2 text-start align-top";
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[32rem] border-collapse text-sm">
        <caption className="sr-only">{text.compare.title}</caption>
        <thead>
          <tr className="border-b border-white/15">
            <td className={cell} />
            {units.map((u) => (
              <th key={u.code} scope="col" className={`${cell} text-base`}>
                <Link href={u.href} className="font-semibold text-white underline-offset-2 hover:underline">
                  {text.unit} {u.code}
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {facts.map(([label, value]) => (
            <tr key={label} className="border-b border-white/5">
              <th scope="row" className={`${cell} font-normal text-zinc-400`}>
                {label}
              </th>
              {units.map((u) => (
                <td key={u.code} className={`${cell} font-medium tabular-nums`}>
                  {value(u)}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <td className={cell} />
            {units.map((u) => (
              <td key={u.code} className={`${cell} space-y-2`}>
                {u.enquiryHref && <WhatsAppButton href={u.enquiryHref} label={text.contact.unitButton} />}
                {u.planImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.planImageUrl} alt={text.panel.plan(u.code)} className="w-full max-w-60 rounded border border-white/10 bg-white" />
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
