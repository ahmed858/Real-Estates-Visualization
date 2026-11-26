// Renderer for `type: "image-2d"`: the scene image with an SVG overlay drawn in
// the image's own pixel coordinates (viewBox = image size), so hotspots scale
// together with the image at any width.
import type { KeyboardEvent } from "react";
import type { Hotspot, UnitStatus } from "@/modules/schema";
import type { SceneRendererProps } from "./scene-renderer";

/** Hotspot fills per unit status; scene hotspots use the neutral fill. U-306 refines the palette. */
export const HOTSPOT_FILL: Record<UnitStatus | "scene", string> = {
  available: "#2f9e44",
  reserved: "#f59f00",
  sold: "#e03131",
  scene: "#1c7ed6",
};

const pointsAttr = (h: Hotspot) => h.points.map(([x, y]) => `${x},${y}`).join(" ");

export function Image2DScene({ scene, imageUrl, unitStatusOf, hotspotLabel, onSelect }: SceneRendererProps) {
  const { width, height } = scene.image;
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
      <img src={imageUrl} alt={scene.title.en} width={width} height={height} className="absolute inset-0 h-full w-full select-none" draggable={false} />
      <svg viewBox={`0 0 ${width} ${height}`} className="absolute inset-0 h-full w-full" role="group" aria-label={scene.title.en}>
        {scene.hotspots.map((h) => {
          const status = "scene" in h.target ? undefined : unitStatusOf(h);
          const fill = status ? HOTSPOT_FILL[status] : HOTSPOT_FILL.scene;
          return (
            <polygon
              key={h.id}
              data-hotspot={h.id}
              data-status={status ?? ("scene" in h.target ? "scene" : "unknown")}
              points={pointsAttr(h)}
              fill={fill}
              stroke={fill}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              role="button"
              tabIndex={0}
              aria-label={hotspotLabel(h)}
              className="cursor-pointer outline-none transition-[fill-opacity] [fill-opacity:0.35] hover:[fill-opacity:0.6] focus-visible:[fill-opacity:0.6]"
              onClick={() => activate(h)}
              onKeyDown={onKey(h)}
            />
          );
        })}
      </svg>
    </div>
  );
}
