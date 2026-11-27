// Pure camera maths for the panorama renderer: where the visitor looks
// (yaw and pitch in degrees, yaw 0 = the centre of the picture), how a drag,
// a key or a zoom changes it, and the direction vector three.js needs.

export interface PanoramaLook {
  /** Degrees, 0 = centre of the picture, growing to the right; kept in [-180, 180). */
  yaw: number;
  /** Degrees, 0 = horizon, positive = up; kept in [-MAX_PITCH, MAX_PITCH]. */
  pitch: number;
  /** Vertical field of view in degrees; smaller = zoomed in. */
  fov: number;
}

export const MAX_PITCH = 85;
export const MIN_FOV = 35;
export const MAX_FOV = 95;
export const DEFAULT_LOOK: PanoramaLook = { yaw: 0, pitch: 0, fov: 75 };
/** Degrees turned by one arrow key press. */
export const KEY_STEP = 10;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const wrapYaw = (yaw: number) => ((((yaw + 180) % 360) + 360) % 360) - 180;

export function normaliseLook({ yaw, pitch, fov }: PanoramaLook): PanoramaLook {
  return { yaw: wrapYaw(yaw), pitch: clamp(pitch, -MAX_PITCH, MAX_PITCH), fov: clamp(fov, MIN_FOV, MAX_FOV) };
}

/**
 * A drag of (dx, dy) pixels on a view `height` pixels tall: the picture
 * follows the pointer, so dragging right turns the view left. The speed
 * matches the field of view, so a point under the pointer stays under it.
 */
export function dragLook(look: PanoramaLook, dx: number, dy: number, height: number): PanoramaLook {
  const degreesPerPixel = look.fov / Math.max(1, height);
  return normaliseLook({ ...look, yaw: look.yaw - dx * degreesPerPixel, pitch: look.pitch + dy * degreesPerPixel });
}

/** Zooms by a wheel or pinch step; positive `delta` zooms out. */
export function zoomLook(look: PanoramaLook, delta: number): PanoramaLook {
  return normaliseLook({ ...look, fov: look.fov + delta });
}

/**
 * The look after a key press, or undefined for a key the view ignores.
 * In a right-to-left page the left and right arrows swap, as for the turntable.
 */
export function keyLook(look: PanoramaLook, key: string, rtl = false): PanoramaLook | undefined {
  const side = rtl ? -1 : 1;
  switch (key) {
    case "ArrowLeft":
      return normaliseLook({ ...look, yaw: look.yaw - KEY_STEP * side });
    case "ArrowRight":
      return normaliseLook({ ...look, yaw: look.yaw + KEY_STEP * side });
    case "ArrowUp":
      return normaliseLook({ ...look, pitch: look.pitch + KEY_STEP });
    case "ArrowDown":
      return normaliseLook({ ...look, pitch: look.pitch - KEY_STEP });
    case "+":
    case "=":
      return zoomLook(look, -10);
    case "-":
      return zoomLook(look, 10);
    default:
      return undefined;
  }
}

/**
 * Unit vector the camera looks along, in three.js world axes for a picture
 * shown with EquirectangularReflectionMapping: yaw 0 is +x (the centre
 * column), yaw 90 is +z, which the picture shows to the right of the centre.
 */
export function lookDirection({ yaw, pitch }: Pick<PanoramaLook, "yaw" | "pitch">): [number, number, number] {
  const y = (yaw * Math.PI) / 180;
  const p = (pitch * Math.PI) / 180;
  return [Math.cos(p) * Math.cos(y), Math.sin(p), Math.cos(p) * Math.sin(y)];
}
