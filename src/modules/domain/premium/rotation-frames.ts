// File paths of a rotation-360 scene's frames: `rotation.frames` with
// {index} replaced by the 1-based frame number, zero-padded to the number of
// digits of `count` (frame-01 .. frame-36 for 36 frames).
import { ROTATION_FRAME_PLACEHOLDER, type SceneRotation } from "@/modules/schema";

/** Path of frame `n` (1-based). */
export function rotationFramePath(rotation: Pick<SceneRotation, "frames" | "count">, n: number): string {
  const index = String(n).padStart(String(rotation.count).length, "0");
  return rotation.frames.split(ROTATION_FRAME_PLACEHOLDER).join(index);
}

/** Paths of every frame, in order. */
export function rotationFramePaths(rotation: Pick<SceneRotation, "frames" | "count">): string[] {
  return Array.from({ length: rotation.count }, (_, i) => rotationFramePath(rotation, i + 1));
}
