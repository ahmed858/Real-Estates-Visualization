// Pure helpers for the rotation-360 renderer: which frame to show, and the
// 2D scene (frame image + that frame's polygons) the 2D renderer draws for it.
import { rotationFramePath } from "@/modules/domain";
import type { Scene, SceneRotation } from "@/modules/schema";

/** URL parameter that keeps the angle when a link is shared. */
export const FRAME_PARAM = "frame";

/** Any whole number brought into the frame range 1..count, wrapping around (0 is count, count + 1 is 1). */
export function wrapFrame(n: number, count: number): number {
  return ((((n - 1) % count) + count) % count) + 1;
}

/** The frame in `?frame=` when it is a valid frame number, otherwise `start` (or 1). */
export function initialFrame(rotation: SceneRotation, search: string): number {
  const raw = new URLSearchParams(search).get(FRAME_PARAM);
  const n = raw !== null && /^[1-9]\d*$/.test(raw) ? Number(raw) : NaN;
  if (n >= 1 && n <= rotation.count) return n;
  return rotation.start ?? 1;
}

/** `search` with `?frame=` set to n (other parameters kept). */
export function withFrame(search: string, n: number): string {
  const params = new URLSearchParams(search);
  params.set(FRAME_PARAM, String(n));
  return `?${params.toString()}`;
}

/**
 * The scene as the 2D renderer should draw it on frame n: the frame image,
 * and only the hotspots that have a polygon on that frame (with that polygon).
 */
export function sceneOnFrame(scene: Scene, rotation: SceneRotation, n: number): Scene {
  return {
    ...scene,
    image: { path: rotationFramePath(rotation, n), width: rotation.width, height: rotation.height },
    hotspots: scene.hotspots.flatMap((h) => {
      const points = h.frames?.[String(n)];
      return points ? [{ ...h, points }] : [];
    }),
  };
}

/** Base URL for project files, from the scene image's URL (e.g. "/files/demo/"). */
export function fileBaseFrom(imageUrl: string, imagePath: string): string {
  return imageUrl.endsWith(imagePath) ? imageUrl.slice(0, imageUrl.length - imagePath.length) : "";
}
