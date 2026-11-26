"use client";
// Client boundary for the scene: turns plain, serialisable data from the page
// (statuses by unit code, scene titles by id) into the callbacks SceneView
// needs. Server pages cannot pass functions to client components.
import type { Hotspot, Scene, UnitStatus } from "@/modules/schema";
import { viewerText, type ViewerLocale, type ViewerText } from "../layout/viewer-text";
import { SceneView } from "./scene-view";

export interface SceneStageProps {
  scene: Scene;
  imageUrl: string;
  /** Status per unit code, from the units sheet. */
  unitStatus: Readonly<Record<string, UnitStatus>>;
  /** Localised title per scene id, used to name scene hotspots. */
  sceneTitles: Readonly<Record<string, string>>;
  locale: ViewerLocale;
}

export function hotspotLabeller(unitStatus: SceneStageProps["unitStatus"], sceneTitles: SceneStageProps["sceneTitles"], text: ViewerText) {
  return (h: Hotspot): string => {
    const t = h.target;
    if ("scene" in t) return sceneTitles[t.scene] ?? t.scene;
    if ("unit" in t) {
      const status = unitStatus[t.unit];
      return status ? `${text.unit} ${t.unit}, ${text.status[status]}` : `${text.unit} ${t.unit}`;
    }
    return `${text.unit} ${t.unitSuffix}`;
  };
}

export function SceneStage({ scene, imageUrl, unitStatus, sceneTitles, locale }: SceneStageProps) {
  const text = viewerText(locale);
  return (
    <SceneView
      scene={scene}
      imageUrl={imageUrl}
      unitStatusOf={(h) => ("unit" in h.target ? unitStatus[h.target.unit] : undefined)}
      hotspotLabel={hotspotLabeller(unitStatus, sceneTitles, text)}
    />
  );
}
