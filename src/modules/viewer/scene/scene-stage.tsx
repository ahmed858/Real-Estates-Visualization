"use client";
// Client boundary for the scene: turns plain, serialisable data from the page
// (unit summaries by code, scene titles and counts by id) into the callbacks
// SceneView needs, and shows the hover card for the hovered or focused
// hotspot. Clicking a unit selects it in the URL (see useSelectedUnit);
// clicking a scene hotspot opens that scene. On a typical floor the unit
// codes follow the floor chosen in the URL (?floor=). Server pages cannot
// pass functions to client components.
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Hotspot, Scene } from "@/modules/schema";
import { viewerText, type ViewerLocale, type ViewerText } from "../layout/viewer-text";
import { HoverCard, type HoverCardContent, type SceneSummary, type UnitSummary } from "./hover-card";
import { useSelectedFloor, useSelectedUnit } from "../selection/use-selected-unit";
import { SceneView } from "./scene-view";

export interface SceneStageProps {
  scene: Scene;
  imageUrl: string;
  /** Units drawn on this scene, by code, from the units sheet. */
  units: Readonly<Record<string, UnitSummary>>;
  /** Localised title per scene id, used to name scene hotspots. */
  sceneTitles: Readonly<Record<string, string>>;
  /** What each scene id holds (rolled up the tree), shown on the floor card of scene hotspots. */
  sceneSummaries: Readonly<Record<string, SceneSummary>>;
  /** URL of each scene id; selecting a scene hotspot navigates there. */
  sceneHrefs: Readonly<Record<string, string>>;
  /** ISO 4217 code of the project currency, e.g. "EGP". */
  currency: string;
  locale: ViewerLocale;
  /** For a typical floor scene: each concrete floor with its hotspot id → unit code map. */
  floors?: readonly ConcreteFloorCodes[];
}

export interface ConcreteFloorCodes {
  floor: number;
  codes: Readonly<Record<string, string>>;
}

/** The unit code a hotspot stands for: its own code, or the typical floor's code on the given floor. */
export function hotspotUnitCode(h: Hotspot, floor?: ConcreteFloorCodes): string | undefined {
  const t = h.target;
  if ("unit" in t) return t.unit;
  if ("unitSuffix" in t) return floor?.codes[h.id];
  return undefined;
}

export function hotspotLabeller(
  units: SceneStageProps["units"],
  sceneTitles: SceneStageProps["sceneTitles"],
  text: ViewerText,
  codeOf: (h: Hotspot) => string | undefined,
) {
  return (h: Hotspot): string => {
    const t = h.target;
    if ("scene" in t) return sceneTitles[t.scene] ?? t.scene;
    const code = codeOf(h) ?? ("unitSuffix" in t ? t.unitSuffix : h.id);
    const status = units[code]?.status;
    return status ? `${text.unit} ${code}, ${text.status[status]}` : `${text.unit} ${code}`;
  };
}

function cardContent(h: Hotspot, props: SceneStageProps, codeOf: (h: Hotspot) => string | undefined): HoverCardContent | null {
  const t = h.target;
  if ("scene" in t) return { kind: "scene", title: props.sceneTitles[t.scene] ?? t.scene, summary: props.sceneSummaries[t.scene] };
  const code = codeOf(h);
  const unit = code ? props.units[code] : undefined;
  return unit ? { kind: "unit", unit } : null;
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
  const [, selectUnit] = useSelectedUnit();
  const router = useRouter();
  const floors = props.floors ?? [];
  const selectedFloor = useSelectedFloor(floors.map((f) => f.floor));
  const floorCodes = floors.find((f) => f.floor === selectedFloor);
  const codeOf = (h: Hotspot) => hotspotUnitCode(h, floorCodes);
  const content = hovered ? cardContent(hovered, props, codeOf) : null;
  return (
    <div className="relative">
      <SceneView
        scene={scene}
        imageUrl={imageUrl}
        unitStatusOf={(h) => {
          const code = codeOf(h);
          return code ? units[code]?.status : undefined;
        }}
        hotspotLabel={hotspotLabeller(units, sceneTitles, text, codeOf)}
        onHover={setHovered}
        onSelect={(h) => {
          const t = h.target;
          if ("scene" in t) {
            const href = props.sceneHrefs[t.scene];
            if (href) router.push(href);
            return;
          }
          const code = codeOf(h);
          if (code && units[code]) selectUnit(code);
        }}
      />
      {hovered && content && (
        <div className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full pb-2" style={anchorOf(hovered, scene)} data-testid="hover-card">
          <HoverCard content={content} text={text} locale={locale} currency={currency} />
        </div>
      )}
    </div>
  );
}
