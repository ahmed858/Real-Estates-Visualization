// Zoom rules for the scene on phones: 1× to 3×, pinch scales by the change
// in finger distance from where the pinch started.
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 3;
export const ZOOM_STEP = 0.5;

export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return MIN_ZOOM;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/** The zoom during a pinch that started at `startZoom` with the fingers `startDistance` apart. */
export function pinchZoom(startZoom: number, startDistance: number, distance: number): number {
  if (startDistance <= 0) return clampZoom(startZoom);
  return clampZoom(startZoom * (distance / startDistance));
}
