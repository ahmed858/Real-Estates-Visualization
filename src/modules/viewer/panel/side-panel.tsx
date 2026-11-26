"use client";
// The side panel: details of the unit selected in the URL, or the scene
// summary when nothing (or an unknown code) is selected.
import type { SceneStats } from "@/modules/domain";
import { ScenePanel } from "../layout/scene-panel";
import { viewerText, type ViewerLocale } from "../layout/viewer-text";
import type { UnitSummary } from "../scene/hover-card";
import { useSelectedUnit } from "../selection/use-selected-unit";
import { UnitDetails } from "./unit-details";

export interface SidePanelProps {
  sceneTitle: string;
  stats?: SceneStats;
  /** Units drawn on this scene, by code. */
  units: Readonly<Record<string, UnitSummary>>;
  currency: string;
  locale: ViewerLocale;
}

export function SidePanel({ sceneTitle, stats, units, currency, locale }: SidePanelProps) {
  const [selected, select] = useSelectedUnit();
  const text = viewerText(locale);
  const unit = selected ? units[selected] : undefined;
  if (unit) return <UnitDetails unit={unit} text={text} locale={locale} currency={currency} onClose={() => select(null)} />;
  return <ScenePanel sceneTitle={sceneTitle} text={text} stats={stats} locale={locale} currency={currency} />;
}
