"use client";
// Client boundary for the scene: turns plain, serialisable data from the page
// (unit summaries by code, scene titles and counts by id) into the callbacks
// SceneView needs, and shows the hover card for the hovered or focused
// hotspot. Server pages cannot pass functions to client components.
import { useState } from "react";
import type { Hotspot, Scene, UnitStatus } from "@/modules/schema";
import { viewerText, type ViewerLocale, type ViewerText } from "../layout/viewer-text";
import { HoverCard, type HoverCardContent, type UnitSummary } from "./hover-card";
import { SceneView } from "./scene-view";

export interface SceneStageProps {
  scene: Scene;
  imageUrl: string;
  /** Units drawn on this scene, by code, from the units sheet. */
  units: Readonly<Record<string, UnitSummary>>;
  /** Localised title per scene id, used to name scene hotspots. */
  sceneTitles: Readonly<Record<string, string>>;
  /** Units per status for each scene id (rolled up the tree), shown on scene hotspot cards. */
  sceneCounts: Readonly<Record<string, Record<UnitStatus, number>>>;
  /** ISO 4217 code of the project currency, e.g. "EGP". */
  currency: string;
  locale: ViewerLocale;
}

export function hotspotLabeller(units: SceneStageProps["units"], sceneTitles: SceneStageProps["sceneTitles"], text: ViewerText) {
  return (h: Hotspot): string => {
    const t = h.target;
    if ("scene" in t) return sceneTitles[t.scene] ?? t.scene;
    if ("unit" in t) {
      const status = units[t.unit]?.status;
      return status ? `${text.unit} ${t.unit}, ${text.status[status]}` : `${text.unit} ${t.unit}`;
    }
    return `${text.unit} ${t.unitSuffix}`;
  };
}

function cardContent(h: Hotspot, props: SceneStageProps): HoverCardContent | null {
  const t = h.target;
  if ("scene" in t) return { kind: "scene", title: props.sceneTitles[t.scene] ?? t.scene, counts: props.sceneCounts[t.scene] };
  if ("unit" in t) {
    const unit = props.units[t.unit];
    return unit ? { kind: "unit", unit } : null;
  }
  return null;
}

/** Top-centre of the hotspot's bounding box, as percentages of the image size. */
function anchorOf(h: Hotspot, scene: Scene) {
  const xs = h.points.map(([x]) => x);
  const ys = h.points.map(([, y]) => y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  return { left: `${(cx / scene.image.width) * 100}%`, top: `${(Math.min(...ys) / scene.image.height) * 100}%` };
}

export function SceneStage(props: SceneStageProps) {
  const { scene, imageUrl, units, sceneTitles, locale, currency } = props;
  const text = viewerText(locale);
  const [hovered, setHovered] = useState<Hotspot | null>(null);
  const content = hovered ? cardContent(hovered, props) : null;
  return (
    <div className="relative">
      <SceneView
        scene={scene}
        imageUrl={imageUrl}
        unitStatusOf={(h) => ("unit" in h.target ? units[h.target.unit]?.status : undefined)}
        hotspotLabel={hotspotLabeller(units, sceneTitles, text)}
        onHover={setHovered}
      />
      {hovered && content && (
        <div className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full pb-2" style={anchorOf(hovered, scene)} data-testid="hover-card">
          <HoverCard content={content} text={text} locale={locale} currency={currency} />
        </div>
      )}
    </div>
  );
}
