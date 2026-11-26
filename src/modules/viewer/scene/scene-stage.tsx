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
import { filterUnits, matchesFilter, type FilterableUnit } from "@/modules/domain";
import type { Hotspot, Scene } from "@/modules/schema";
import { isEmptyFilter } from "../table/filter-params";
import { useUnitFilter } from "../table/use-unit-filter";
import { viewerText, type ViewerLocale, type ViewerText } from "../layout/viewer-text";
import { HoverCard, type HoverCardContent, type SceneSummary, type UnitSummary } from "./hover-card";
import { useSelectedFloor, useSelectedUnit } from "../selection/use-selected-unit";
import { SceneView } from "./scene-view";
import { Zoomable } from "./zoomable";

export interface SceneStageProps {
  scene: Scene;
  imageUrl: string;
  /** Units drawn on this scene, by code, from the units sheet. */
  units: Readonly<Record<string, UnitSummary>>;
  /** Localised title per scene id, used to name scene hotspots. */
  sceneTitles: Readonly<Record<string, string>>;
  /** What each scene id holds (rolled up the tree), shown on the floor card of scene hotspots. */
  sceneSummaries: Readonly<Record<string, SceneSummary>>;
  /**
   * Every unit at or below each scene id (rolled up the tree). With a units
   * filter in the URL, scene hotspots show how many of them match.
   */
  sceneUnits?: Readonly<Record<string, readonly FilterableUnit[]>>;
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

/** Hotspots whose top lies above this share of the image height get their card below the anchor. */
const FLIP_BELOW = 0.35;

/**
 * Top-centre of the hotspot's bounding box, as percentages of the image size.
 * Near the top of the image the card hangs below that point instead of above
 * it, so the stage edge does not cut it off and the top bar does not hide it.
 */
function anchorOf(h: Hotspot, scene: Scene) {
  const xs = h.points.map(([x]) => x);
  const ys = h.points.map(([, y]) => y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const top = Math.min(...ys) / scene.image.height;
  return { left: `${(cx / scene.image.width) * 100}%`, top: `${top * 100}%`, below: top < FLIP_BELOW };
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
  const { filter } = useUnitFilter();
  const filtering = !isEmptyFilter(filter);
  const num = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US");
  const matchesBelow = (h: Hotspot) => ("scene" in h.target ? filterUnits(props.sceneUnits?.[h.target.scene] ?? [], filter).length : 0);
  const anchor = hovered ? anchorOf(hovered, scene) : null;
  // The scene fits the stage: as wide as the stage allows, and never taller
  // than --stage-height (set by the viewer layout; the viewport by default).
  const ratio = scene.image.width / scene.image.height;
  return (
    <div className="relative mx-auto w-full" style={{ maxWidth: `calc(var(--stage-height, 100dvh) * ${ratio})` }} data-testid="scene-stage">
      <Zoomable text={text}>
        <SceneView
          scene={scene}
          imageUrl={imageUrl}
          unitStatusOf={(h) => {
            const code = codeOf(h);
            return code ? units[code]?.status : undefined;
          }}
          hotspotLabel={hotspotLabeller(units, sceneTitles, text, codeOf)}
          onHover={setHovered}
          hotspotEmphasis={
            filtering
              ? (h) => {
                  if ("scene" in h.target) return matchesBelow(h) > 0 ? "match" : "dim";
                  const code = codeOf(h);
                  const unit = code ? units[code] : undefined;
                  return unit && matchesFilter(unit, filter) ? "match" : "dim";
                }
              : undefined
          }
          hotspotBadge={filtering ? (h) => ("scene" in h.target ? num.format(matchesBelow(h)) : undefined) : undefined}
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
        {anchor && content && (
          <div
            className={`pointer-events-none absolute z-30 -translate-x-1/2 ${anchor.below ? "translate-y-0 pt-12" : "-translate-y-full pb-2"}`}
            style={{ left: anchor.left, top: anchor.top }}
            data-testid="hover-card"
            data-placement={anchor.below ? "below" : "above"}
          >
            <HoverCard content={content} text={text} locale={locale} currency={currency} />
          </div>
        )}
      </Zoomable>
    </div>
  );
}
