// The demo turntable's camera: the villa stands on a turntable and is seen
// from a fixed, tilted viewpoint (orthographic). Frame 1 looks at the south
// face (the courtyard side), like the facade drawing; each next frame turns
// the building by the same step. World coordinates are the plan's metres
// (x east, y south) plus z, the height above the ground.
import type { Point } from "../geometry/types";

export type WorldPoint = readonly [x: number, y: number, z: number];

/** Frames in the demo turntable: one every 15°. */
export const TURNTABLE_FRAMES = 24;
export const TURNTABLE_WIDTH = 800;
export const TURNTABLE_HEIGHT = 540;
/** Pixels per metre. */
const SCALE = 16;
/** How far the camera looks down, in degrees (0 = level, 90 = plan view). */
const TILT = 30;
/** Image row of the turntable centre at ground level. */
const CENTRE_Y = 290;

export interface TurntableCamera {
  /** Rotation of the building for this frame, in degrees. */
  angle: number;
  /** World point → frame pixels. */
  toPx: (point: WorldPoint) => [number, number];
  /** Distance towards the viewer (larger is nearer); used to draw back to front. */
  depth: (point: Point) => number;
  /** Whether a vertical face with this outward normal (in plan) faces the viewer. */
  faces: (normal: Point) => boolean;
}

/** Angle of a 1-based frame number. */
export const frameAngle = (frame: number): number => ((frame - 1) * 360) / TURNTABLE_FRAMES;

export function turntableCamera(angle: number, centre: Point): TurntableCamera {
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const tilt = (TILT * Math.PI) / 180;
  const across = ([x, y]: Point) => (x - centre[0]) * cos - (y - centre[1]) * sin;
  const depth = ([x, y]: Point) => (x - centre[0]) * sin + (y - centre[1]) * cos;
  return {
    angle,
    depth,
    toPx: ([x, y, z]) => [
      TURNTABLE_WIDTH / 2 + across([x, y]) * SCALE,
      CENTRE_Y + depth([x, y]) * Math.sin(tilt) * SCALE - z * Math.cos(tilt) * SCALE,
    ],
    faces: ([nx, ny]) => nx * sin + ny * cos > 1e-9,
  };
}
