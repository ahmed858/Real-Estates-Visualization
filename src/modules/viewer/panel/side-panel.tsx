"use client";
// The side panel: details of the unit selected in the URL, or the scene
// summary when nothing (or an unknown code) is selected.
import type { SceneStats } from "@/modules/domain";
import { ScenePanel } from "../layout/scene-panel";
import { viewerText, type ViewerLocale } from "../layout/viewer-text";
import type { UnitSummary } from "../scene/hover-card";
import { selectUnit, useSelectedUnit } from "../selection/use-selected-unit";
import { UnitDetails } from "./unit-details";
import { useEffect } from "react";
import { enquiryMessage, whatsappLink } from "../contact/whatsapp";

export interface SidePanelProps {
  sceneTitle: string;
  stats?: SceneStats;
  /** Units drawn on this scene, by code. */
  units: Readonly<Record<string, UnitSummary>>;
  currency: string;
  locale: ViewerLocale;
  /** Enables the WhatsApp enquiry button on unit details. */
  enquiry?: {
    /** `project.contact.whatsapp`, e.g. "+201001234567". */
    whatsapp: string;
    projectName: string;
    /** True on a typical floor scene: the message then names the unit's floor. */
    typicalFloor?: boolean;
  };
  /** The units page; adds "Compare with other units" to unit details. */
  unitsHref?: string;
}

const closeUnit = () => selectUnit(null);

/** Escape closes the unit details from anywhere on the page. */
function useEscapeToClose(active: boolean, close: () => void) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, close]);
}

export function SidePanel({ sceneTitle, stats, units, currency, locale, enquiry, unitsHref }: SidePanelProps) {
  const [selected] = useSelectedUnit();
  const text = viewerText(locale);
  const unit = selected ? units[selected] : undefined;
  useEscapeToClose(unit !== undefined, closeUnit);
  if (unit) {
    const enquiryHref =
      enquiry &&
      whatsappLink(
        enquiry.whatsapp,
        enquiryMessage(text, {
          projectName: enquiry.projectName,
          unitCode: unit.code,
          ...(enquiry.typicalFloor && { floor: new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US").format(unit.floor) }),
        }),
      );
    return <UnitDetails unit={unit} text={text} locale={locale} currency={currency} onClose={closeUnit} enquiryHref={enquiryHref} unitsHref={unitsHref} />;
  }
  return <ScenePanel sceneTitle={sceneTitle} text={text} stats={stats} locale={locale} currency={currency} />;
}
