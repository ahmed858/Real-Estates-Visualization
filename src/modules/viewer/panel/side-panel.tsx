"use client";
// The side panel: details of the unit selected in the URL, or the scene
// summary when nothing (or an unknown code) is selected.
import type { SceneStats } from "@/modules/domain";
import { ScenePanel } from "../layout/scene-panel";
import { viewerText, type ViewerLocale } from "../layout/viewer-text";
import type { UnitSummary } from "../scene/hover-card";
import { useSelectedUnit } from "../selection/use-selected-unit";
import { UnitDetails } from "./unit-details";
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
}

export function SidePanel({ sceneTitle, stats, units, currency, locale, enquiry }: SidePanelProps) {
  const [selected, select] = useSelectedUnit();
  const text = viewerText(locale);
  const unit = selected ? units[selected] : undefined;
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
    return <UnitDetails unit={unit} text={text} locale={locale} currency={currency} onClose={() => select(null)} enquiryHref={enquiryHref} />;
  }
  return <ScenePanel sceneTitle={sceneTitle} text={text} stats={stats} locale={locale} currency={currency} />;
}
