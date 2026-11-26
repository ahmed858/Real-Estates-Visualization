"use client";
// Renderer for `type: "image-2d"`: the scene image with an SVG overlay drawn in
// the image's own pixel coordinates (viewBox = image size), so hotspots scale
// together with the image at any width. Hotspots are invisible until the
// pointer or keyboard focus is on them; the active shape gets a soft fill in
// its status colour (scene hotspots use the brand accent), a bright thin
// outline and a glow.
import { useId, useState, type CSSProperties, type KeyboardEvent } from "react";
import type { Hotspot } from "@/modules/schema";
import type { SceneRendererProps } from "./scene-renderer";
import { HatchPattern, SCENE_HOTSPOT_PAINT, STATUS_STYLE } from "./status-style";

const pointsAttr = (h: Hotspot) => h.points.map(([x, y]) => `${x},${y}`).join(" ");

export function Image2DScene({ scene, imageUrl, unitStatusOf, hotspotLabel, onSelect, onHover }: SceneRendererProps) {
  const { width, height } = scene.image;
  const hatchId = `hatch-${useId().replace(/:/g, "")}`;
  const [active, setActive] = useState<string | null>(null);
  const hover = (h: Hotspot | null) => {
    setActive(h?.id ?? null);
    onHover?.(h);
  };
  const activate = (h: Hotspot) => onSelect?.(h);
  const onKey = (h: Hotspot) => (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      activate(h);
    }
  };
  return (
    <div className="relative w-full" style={{ aspectRatio: `${width} / ${height}` }}>
      {/* A plain <img>: project images are served by our own route and are mostly SVG. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt={scene.title.en} width={width} height={height} className="absolute inset-0 h-full w-full select-none object-cover" draggable={false} />
      <svg viewBox={`0 0 ${width} ${height}`} className="absolute inset-0 h-full w-full" role="group" aria-label={scene.title.en}>
        <defs>
          <HatchPattern id={hatchId} />
        </defs>
        {scene.hotspots.map((h) => {
          const isScene = "scene" in h.target;
          const status = isScene ? undefined : unitStatusOf(h);
          const style = STATUS_STYLE[status ?? "scene"];
          const fill = style.color;
          const on = active === h.id;
          const paint = isScene ? SCENE_HOTSPOT_PAINT : fill;
          const look: CSSProperties = {
            fill: paint,
            stroke: paint,
            fillOpacity: on ? 0.28 : 0,
            strokeOpacity: on ? 1 : 0,
            filter: on ? `drop-shadow(0 0 6px ${paint})` : undefined,
            transition: "fill-opacity 150ms, stroke-opacity 150ms",
          };
          return (
            <g key={h.id}>
              <polygon
                data-hotspot={h.id}
                data-status={status ?? (isScene ? "scene" : "unknown")}
                data-active={on || undefined}
                points={pointsAttr(h)}
                fill={fill}
                stroke={fill}
                strokeWidth={1.5}
                strokeDasharray={style.dash}
                vectorEffect="non-scaling-stroke"
                pointerEvents="all"
                role="button"
                tabIndex={0}
                aria-label={hotspotLabel(h)}
                className="cursor-pointer outline-none"
                style={look}
                onClick={() => activate(h)}
                onKeyDown={onKey(h)}
                onMouseEnter={() => hover(h)}
                onMouseLeave={() => hover(null)}
                onFocus={() => hover(h)}
                onBlur={() => hover(null)}
              />
              {style.hatch && <polygon points={pointsAttr(h)} fill={`url(#${hatchId})`} opacity={on ? 0.6 : 0} pointerEvents="none" aria-hidden="true" data-hatch={h.id} />}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
