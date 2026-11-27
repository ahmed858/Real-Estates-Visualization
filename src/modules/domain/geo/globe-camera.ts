// Camera maths for the globe intro: where a latitude/longitude sits on a unit
// sphere, and how the camera flies from one pose to another as one
// continuous move (turn towards the target first, then dive). Pure numbers,
// no three.js, so it is unit tested and shared by the WebGL globe and tests.

export type Vec3 = readonly [number, number, number];

export interface LatLng {
  lat: number;
  lng: number;
}

/** Where the camera is: a direction from the globe centre and a height above the surface, in globe radii. */
export interface CameraPose {
  dir: Vec3;
  altitude: number;
}

const RAD = Math.PI / 180;

/**
 * Unit vector of a point on the globe, y up, matching how three.js wraps an
 * equirectangular texture on a sphere (longitude -180 at the texture's left edge).
 */
export function latLngToVector({ lat, lng }: LatLng): Vec3 {
  const phi = (lng + 180) * RAD;
  const c = Math.cos(lat * RAD);
  return [-Math.cos(phi) * c, Math.sin(lat * RAD), Math.sin(phi) * c];
}

/** Inverse of latLngToVector (the vector need not be unit length). */
export function vectorToLatLng([x, y, z]: Vec3): LatLng {
  const r = Math.hypot(x, y, z) || 1;
  const lat = Math.asin(Math.max(-1, Math.min(1, y / r))) / RAD;
  let lng = Math.atan2(z, -x) / RAD - 180;
  if (lng < -180) lng += 360;
  return { lat, lng };
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const normalize = (v: Vec3): Vec3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

/** Spherical interpolation between two unit vectors (along the great circle). */
export function slerp(a: Vec3, b: Vec3, t: number): Vec3 {
  const cos = Math.max(-1, Math.min(1, dot(a, b)));
  const angle = Math.acos(cos);
  if (angle < 1e-6) return b;
  const s = Math.sin(angle);
  const wa = Math.sin((1 - t) * angle) / s;
  const wb = Math.sin(t * angle) / s;
  return normalize([a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb]);
}

/** Slow at both ends, fast in the middle. */
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Share of a flight spent turning towards the target; the dive runs the whole flight. */
const TURN_SHARE = 0.55;

/**
 * The camera pose a share `t` (0..1) of the way through a flight. The camera
 * turns along the great circle (done by TURN_SHARE) while its height changes
 * geometrically, so every halving of the height takes the same time and a
 * dive from orbit to street level feels even rather than rushed at the end.
 */
export function flightPose(from: CameraPose, to: CameraPose, t: number): CameraPose {
  const clamped = Math.max(0, Math.min(1, t));
  const turn = easeInOut(Math.min(1, clamped / TURN_SHARE));
  const dive = easeInOut(clamped);
  const altitude = Math.exp(Math.log(from.altitude) + (Math.log(to.altitude) - Math.log(from.altitude)) * dive);
  return { dir: slerp(from.dir, to.dir, turn), altitude };
}

/** Whether a point on the globe faces the camera (with a margin so labels fade before the horizon). */
export function facesCamera(point: Vec3, pose: CameraPose, margin = 0.05): boolean {
  // A point is visible from height h when its angle to the camera is below acos(1 / (1 + h)).
  const horizon = 1 / (1 + pose.altitude);
  return dot(normalize(point), normalize(pose.dir)) > horizon + margin * (1 - horizon);
}
