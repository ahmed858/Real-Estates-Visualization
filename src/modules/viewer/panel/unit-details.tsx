"use client";
// Side panel content for a selected unit: its facts, a WhatsApp enquiry
// button, a share button, plan image and notes.
import Link from "next/link";
import { useState } from "react";
import { PhotoLightbox } from "./photo-lightbox";
import { PICK_PARAM, withCodes } from "../compare/compare-params";
import { formatPrice, type UnitSummary } from "../scene/hover-card";
import type { ViewerLocale, ViewerText } from "../layout/viewer-text";
import { WhatsAppButton } from "../contact/whatsapp-button";
import { ShareButton, type ShareTarget } from "../contact/share-button";

export interface UnitDetailsProps {
  unit: UnitSummary;
  text: ViewerText;
  locale: ViewerLocale;
  currency: string;
  onClose: () => void;
  /** WhatsApp link for an enquiry about this unit; omitted hides the button. */
  enquiryHref?: string;
  /** Share and copy functions; defaults to the browser's. */
  shareTarget?: ShareTarget;
  /** The units page, e.g. "/p/demo/units?lang=en"; adds a link to compare this unit with others. */
  unitsHref?: string;
}

export function UnitDetails({ unit, text, locale, currency, onClose, enquiryHref, shareTarget, unitsHref }: UnitDetailsProps) {
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
  const gallery = unit.galleryUrls ?? [];
  const photoAlt = (i: number) => text.panel.photo(unit.code, num.format(i + 1), num.format(gallery.length));
  const [photo, setPhoto] = useState<number | null>(null);
  return (
    <section aria-label={title} className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {/* Close stays last in focus order, after Share. */}
        <div className="flex items-start gap-1">
          <ShareButton code={unit.code} title={title} text={text} target={shareTarget} />
          <button type="button" onClick={onClose} className="rounded-md px-2 py-1 text-sm text-zinc-400 hover:bg-white/10">
            {text.panel.close}
          </button>
        </div>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-zinc-400">{label}</dt>
            <dd className="font-medium tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      {enquiryHref && <WhatsAppButton href={enquiryHref} label={text.contact.unitButton} />}
      {unitsHref && (
        <Link href={withCodes(unitsHref, PICK_PARAM, [unit.code])} className="text-sm text-zinc-300 underline-offset-2 hover:text-white hover:underline">
          {text.compare.withOthers}
        </Link>
      )}
      {gallery.length > 0 && (
        <ul aria-label={text.panel.photos} className="grid grid-cols-3 gap-2">
          {gallery.map((url, i) => (
            <li key={url}>
              <a
                href={url}
                onClick={(e) => {
                  e.preventDefault();
                  setPhoto(i);
                }}
                className="block overflow-hidden rounded border border-white/10 hover:border-white/40"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={photoAlt(i)} loading="lazy" className="aspect-square w-full object-cover" />
              </a>
            </li>
          ))}
        </ul>
      )}
      {photo !== null && <PhotoLightbox urls={gallery} index={photo} alt={photoAlt} text={text} onIndex={setPhoto} onClose={() => setPhoto(null)} />}
      {unit.planImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={unit.planImageUrl} alt={text.panel.plan(unit.code)} className="w-full rounded border border-white/10 bg-white" />
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
