"use client";
// Lets the scene be pinch-zoomed (1× to 3×) and, once zoomed, panned by
// scrolling. The content is laid out wider instead of CSS-scaled, so the
// hotspots, badges and cards (all positioned in percentages) follow the image
// and native touch scrolling pans it; a tap still reaches the hotspots.
// Zoom buttons and a reset sit in the corner on phones only.
import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import type { ViewerText } from "../layout/viewer-text";
import { clampZoom, MAX_ZOOM, MIN_ZOOM, pinchZoom, ZOOM_STEP } from "./zoom";

export interface ZoomableProps {
  children: ReactNode;
  text: ViewerText;
}

const distance = (points: Map<number, { x: number; y: number }>) => {
  const [a, b] = [...points.values()];
  return Math.hypot(a.x - b.x, a.y - b.y);
};

export function Zoomable({ children, text }: ZoomableProps) {
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const touches = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ zoom: number; distance: number } | null>(null);

  const down = (e: PointerEvent) => {
    if (e.pointerType !== "touch") return;
    touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.current.size === 2) pinch.current = { zoom, distance: distance(touches.current) };
  };
  const move = (e: PointerEvent) => {
    if (!touches.current.has(e.pointerId)) return;
    touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && touches.current.size === 2) setZoom(pinchZoom(pinch.current.zoom, pinch.current.distance, distance(touches.current)));
  };
  const up = (e: PointerEvent) => {
    touches.current.delete(e.pointerId);
    if (touches.current.size < 2) pinch.current = null;
  };
  const button = "flex h-9 min-w-9 items-center justify-center rounded-full bg-zinc-950/75 px-2 text-lg text-white ring-1 ring-white/20 disabled:opacity-40";

  return (
    <div className="relative">
      <div
        // Only clip and scroll while zoomed in, so at 1× a card may still reach past the image edge.
        className={`[touch-action:pan-x_pan-y] ${zoom > MIN_ZOOM ? "overflow-auto" : "overflow-visible"}`}
        data-testid="zoom-viewport"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <div className="relative" style={{ width: `${zoom * 100}%` }} data-testid="zoom-content" data-zoom={zoom}>
          {children}
        </div>
      </div>
      <div className="absolute bottom-2 end-2 z-20 flex gap-1 md:hidden">
        <button type="button" aria-label={text.zoom.out} disabled={zoom <= MIN_ZOOM} onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))} className={button}>
          −
        </button>
        <button type="button" aria-label={text.zoom.in} disabled={zoom >= MAX_ZOOM} onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))} className={button}>
          +
        </button>
        {zoom > MIN_ZOOM && (
          <button type="button" onClick={() => setZoom(MIN_ZOOM)} className={`${button} text-sm`}>
            {text.zoom.reset}
          </button>
        )}
      </div>
    </div>
  );
}
