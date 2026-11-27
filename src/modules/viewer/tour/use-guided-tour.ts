"use client";
// Runs the guided tour on a scene while ?tour=1 is in the URL: after a beat,
// the scene zooms into the hotspot of the next scene and opens it, or, on the
// last scene, shows the unit's card, selects the unit and (when it has one)
// flies into its 360° view. Any press or key stops the tour and leaves the
// visitor where they are. Timers only; the zoom itself is a CSS transform.
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import type { Hotspot, Scene } from "@/modules/schema";
import { TOUR_PARAM } from "../selection/params";
import { selectUnit, setUrlParams, useUrlParam } from "../selection/use-selected-unit";
import { tourTimings, zoomOrigin, type SceneTourStep } from "./tour-step";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const subscribeMotion = (onChange: () => void) => {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

/** Ends the tour: drops ?tour from the URL. */
export const stopTour = () => setUrlParams({ [TOUR_PARAM]: null });

export interface GuidedTourState {
  active: boolean;
  /** Style for the wrapper of the scene while it zooms into a hotspot. */
  zoomStyle: CSSProperties | undefined;
  stop: () => void;
}

export function useGuidedTour(scene: Scene, step: SceneTourStep | undefined, showCard: (h: Hotspot | null) => void): GuidedTourState {
  const router = useRouter();
  const on = useUrlParam(TOUR_PARAM) === "1";
  const reduced = useSyncExternalStore(subscribeMotion, () => window.matchMedia(REDUCED_MOTION).matches, () => false);
  const [zoomStyle, setZoomStyle] = useState<CSSProperties | undefined>(undefined);
  const active = on && step !== undefined;
  // Latest callbacks, read by the timers without restarting the tour.
  const showCardRef = useRef(showCard);
  const routerRef = useRef(router);
  useEffect(() => {
    showCardRef.current = showCard;
    routerRef.current = router;
  });

  useEffect(() => {
    if (!active || !step) return;
    const hotspot = scene.hotspots.find((h) => h.id === step.hotspotId);
    if (!hotspot) {
      stopTour();
      return;
    }
    const t = tourTimings(reduced);
    const nav = routerRef.current;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    const zoomInto = () => {
      if (reduced) return;
      setZoomStyle({
        transformOrigin: zoomOrigin(hotspot.points, scene.image.width, scene.image.height),
        transform: "scale(2.6)",
        opacity: 0.15,
        transition: `transform ${t.zoom}ms cubic-bezier(0.5, 0, 0.75, 0), opacity ${t.zoom}ms ease-in`,
      });
    };
    if (step.kind === "scene") {
      nav.prefetch(step.href);
      at(t.look, () => {
        showCardRef.current(hotspot);
        zoomInto();
      });
      at(t.look + t.zoom, () => routerRef.current.push(step.href));
    } else {
      if (step.viewHref) nav.prefetch(step.viewHref);
      at(t.card, () => showCardRef.current(hotspot));
      at(t.card + t.select, () => {
        showCardRef.current(null);
        selectUnit(step.code);
        if (!step.viewHref) stopTour();
      });
      const viewHref = step.viewHref;
      if (viewHref) {
        at(t.card + t.select + t.view, zoomInto);
        at(t.card + t.select + t.view + t.zoom, () => routerRef.current.push(viewHref));
      }
    }
    // Any press or key hands control back to the visitor.
    const stop = () => stopTour();
    window.addEventListener("pointerdown", stop);
    window.addEventListener("keydown", stop);
    window.addEventListener("wheel", stop, { passive: true });
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("pointerdown", stop);
      window.removeEventListener("keydown", stop);
      window.removeEventListener("wheel", stop);
      setZoomStyle(undefined);
    };
  }, [active, step, scene, reduced]);

  return { active, zoomStyle: active ? zoomStyle : undefined, stop: stopTour };
}
