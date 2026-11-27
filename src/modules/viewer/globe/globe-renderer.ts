// What the globe view needs from a renderer (Strategy): the WebGL globe and
// the flat SVG map both take camera poses and place the project marker, so
// the view runs one flight and one set of controls for either.
import type { RefObject } from "react";
import type { CameraPose, LatLng } from "@/modules/domain";

export interface GlobeRendererHandle {
  /** Draws the world from this pose and moves the marker to the project on screen. */
  setPose(pose: CameraPose): void;
}

export interface GlobeRendererProps {
  /** The project's position. */
  target: LatLng;
  /** URL of the Natural Earth country shapes (TopoJSON). */
  shapesUrl: string;
  /** Colour of the project's country outline. */
  accent: string;
  /** The marker element, moved by the renderer to the project's screen position. */
  markerRef: RefObject<HTMLElement | null>;
  /** Filled in by the renderer once it can draw. */
  handleRef: RefObject<GlobeRendererHandle | null>;
  onReady: () => void;
  onFail: () => void;
}

/** Places the marker at a screen point, or hides it (behind the globe or off screen). */
export function placeMarker(el: HTMLElement | null, at: { x: number; y: number } | null) {
  if (!el) return;
  if (!at) {
    el.style.opacity = "0";
    el.style.pointerEvents = "none";
    return;
  }
  el.style.opacity = "1";
  el.style.pointerEvents = "";
  el.style.transform = `translate3d(${at.x.toFixed(1)}px, ${at.y.toFixed(1)}px, 0)`;
}
