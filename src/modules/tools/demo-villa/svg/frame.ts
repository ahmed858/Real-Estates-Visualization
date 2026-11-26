// Metres → pixels for the demo villa drawings. Floor plans and their hotspot
// polygons both use this transform, so they always line up.
import type { Point, VillaGeometry } from "../geometry/types";

/** Pixels per metre. */
export const PLAN_SCALE = 40;
/** Space around the plot, in pixels. */
export const PLAN_MARGIN = 60;
/** Extra space below the plot for the title and scale bar, in pixels. */
export const PLAN_FOOTER = 100;

export interface PlanFrame {
  width: number;
  height: number;
  toPx: (point: Point) => [number, number];
  /** Converts a length in metres to pixels. */
  len: (metres: number) => number;
}

export function floorPlanFrame(villa: VillaGeometry): PlanFrame {
  const { plot } = villa;
  return {
    width: plot.width * PLAN_SCALE + 2 * PLAN_MARGIN,
    height: plot.height * PLAN_SCALE + 2 * PLAN_MARGIN + PLAN_FOOTER,
    toPx: ([x, y]) => [PLAN_MARGIN + (x - plot.x) * PLAN_SCALE, PLAN_MARGIN + (y - plot.y) * PLAN_SCALE],
    len: (metres) => metres * PLAN_SCALE,
  };
}
