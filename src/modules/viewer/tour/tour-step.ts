// What the guided tour does on one scene, as plain data a server page can
// pass to the client scene: fly into a hotspot that opens the next scene, or
// show the unit the tour ends on (and then enter its 360° view, if any).
export type SceneTourStep =
  | { kind: "scene"; hotspotId: string; href: string }
  | { kind: "unit"; hotspotId: string; code: string; viewHref?: string };

/** Milliseconds of each beat of the tour; shorter with reduced motion, where nothing zooms. */
export function tourTimings(reduced: boolean) {
  return reduced
    ? { look: 900, zoom: 0, card: 600, select: 1200, view: 2400 }
    : { look: 1300, zoom: 950, card: 900, select: 1800, view: 3200 };
}

/** The hotspot's bounding-box centre as percentages of the image, for the zoom's transform origin. */
export function zoomOrigin(points: readonly (readonly [number, number])[], width: number, height: number): string {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const cx = ((Math.min(...xs) + Math.max(...xs)) / 2 / width) * 100;
  const cy = ((Math.min(...ys) + Math.max(...ys)) / 2 / height) * 100;
  return `${cx.toFixed(2)}% ${cy.toFixed(2)}%`;
}
