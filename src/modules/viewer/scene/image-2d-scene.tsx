// Renderer for `type: "image-2d"`: the scene image with an SVG overlay drawn in
// the image's own pixel coordinates (viewBox = image size), so hotspots scale
// together with the image at any width.
import { useId, type KeyboardEvent } from "react";
import type { Hotspot } from "@/modules/schema";
import type { SceneRendererProps } from "./scene-renderer";
import { HatchPattern, STATUS_STYLE } from "./status-style";


const pointsAttr = (h: Hotspot) => h.points.map(([x, y]) => `${x},${y}`).join(" ");

export function Image2DScene({ scene, imageUrl, unitStatusOf, hotspotLabel, onSelect, onHover }: SceneRendererProps) {
  const { width, height } = scene.image;
  const hatchId = `hatch-${useId().replace(/:/g, "")}`;
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
        <defs>
          <HatchPattern id={hatchId} />
        </defs>
        {scene.hotspots.map((h) => {
          const status = "scene" in h.target ? undefined : unitStatusOf(h);
          const style = STATUS_STYLE[status ?? "scene"];
          const fill = style.color;
          return (
            <g key={h.id}>
              <polygon
                data-hotspot={h.id}
                data-status={status ?? ("scene" in h.target ? "scene" : "unknown")}
                points={pointsAttr(h)}
                fill={fill}
                stroke={fill}
                strokeWidth={2}
                strokeDasharray={style.dash}
                vectorEffect="non-scaling-stroke"
                role="button"
                tabIndex={0}
                aria-label={hotspotLabel(h)}
                className="cursor-pointer outline-none transition-[fill-opacity] [fill-opacity:0.35] hover:[fill-opacity:0.6] focus-visible:[fill-opacity:0.6]"
                onClick={() => activate(h)}
                onKeyDown={onKey(h)}
                onMouseEnter={() => onHover?.(h)}
                onMouseLeave={() => onHover?.(null)}
                onFocus={() => onHover?.(h)}
                onBlur={() => onHover?.(null)}
              />
              {style.hatch && <polygon points={pointsAttr(h)} fill={`url(#${hatchId})`} pointerEvents="none" aria-hidden="true" data-hatch={h.id} />}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
