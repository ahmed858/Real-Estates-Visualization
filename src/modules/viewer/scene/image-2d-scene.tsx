"use client";
// Renderer for `type: "image-2d"`: the scene image with an SVG overlay drawn in
// the image's own pixel coordinates (viewBox = image size), so hotspots scale
// together with the image at any width.
//
// Hotspots stay invisible until hovered or focused, so the image reads clean.
// The active one gets a soft translucent fill in its status colour (scene
// hotspots use the project's brand colour), a bright thin outline and a glow.
// Reserved keeps its dashed outline and sold its hatch, so status never rests
// on colour alone.
import { useId, useState, type KeyboardEvent } from "react";
import type { Hotspot } from "@/modules/schema";
import type { SceneRendererProps } from "./scene-renderer";
import { HatchPattern, STATUS_STYLE, hotspotStyle } from "./status-style";

const pointsAttr = (h: Hotspot) => h.points.map(([x, y]) => `${x},${y}`).join(" ");

export function Image2DScene({ scene, imageUrl, unitStatusOf, hotspotLabel, onSelect, onHover }: SceneRendererProps) {
  const { width, height } = scene.image;
  const hatchId = `hatch-${useId().replace(/:/g, "")}`;
  const [activeId, setActiveId] = useState<string | null>(null);
  const activate = (h: Hotspot) => onSelect?.(h);
  const enter = (h: Hotspot) => {
    setActiveId(h.id);
    onHover?.(h);
  };
  const leave = (h: Hotspot) => {
    setActiveId((id) => (id === h.id ? null : id));
    onHover?.(null);
  };
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
      <img src={imageUrl} alt={scene.title.en} width={width} height={height} className="absolute inset-0 h-full w-full select-none" draggable={false} />
      <svg viewBox={`0 0 ${width} ${height}`} className="absolute inset-0 h-full w-full" role="group" aria-label={scene.title.en}>
        <defs>
          <HatchPattern id={hatchId} />
        </defs>
        {scene.hotspots.map((h) => {
          const isScene = "scene" in h.target;
          const status = isScene ? undefined : unitStatusOf(h);
          const style = STATUS_STYLE[status ?? "scene"];
          const active = activeId === h.id;
          // Scene hotspots glow in the project's brand colour, with the neutral colour as fallback.
          const color = isScene ? `var(--brand-primary, ${style.color})` : style.color;
          return (
            <g key={h.id}>
              <polygon
                data-hotspot={h.id}
                data-status={status ?? (isScene ? "scene" : "unknown")}
                data-active={active ? "true" : undefined}
                points={pointsAttr(h)}
                fill={style.color}
                strokeWidth={1.5}
                strokeDasharray={style.dash}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                pointerEvents="all"
                role="button"
                tabIndex={0}
                aria-label={hotspotLabel(h)}
                style={hotspotStyle(color, active)}
                className="cursor-pointer outline-none transition-[fill-opacity,stroke-opacity,filter] duration-200 ease-out motion-reduce:transition-none"
                onClick={() => activate(h)}
                onKeyDown={onKey(h)}
                onMouseEnter={() => enter(h)}
                onMouseLeave={() => leave(h)}
                onFocus={() => enter(h)}
                onBlur={() => leave(h)}
              />
              {style.hatch && active && <polygon points={pointsAttr(h)} fill={`url(#${hatchId})`} pointerEvents="none" aria-hidden="true" data-hatch={h.id} />}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
