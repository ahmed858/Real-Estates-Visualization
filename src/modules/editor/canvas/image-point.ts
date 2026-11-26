// Pure helpers that turn pointer positions on the drawing canvas into image
// pixels. The SVG uses viewBox = image size with the default
// preserveAspectRatio (xMidYMid meet), so the image is scaled uniformly and
// centred in the element box; points are stored in image pixels whatever the zoom.
import type { ImageSize } from "@/modules/domain";
import type { Point, ProjectConfig, Scene } from "@/modules/schema";

export interface ScreenBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Fit {
  scale: number;
  offsetX: number;
  offsetY: number;
}

function fit(box: ScreenBox, image: ImageSize): Fit | undefined {
  if (box.width <= 0 || box.height <= 0 || image.width <= 0 || image.height <= 0) return undefined;
  const scale = Math.min(box.width / image.width, box.height / image.height);
  return { scale, offsetX: (box.width - image.width * scale) / 2, offsetY: (box.height - image.height * scale) / 2 };
}

/** Image-pixel position of a pointer at (clientX, clientY); undefined when the canvas has no size yet. */
export function toImagePoint(clientX: number, clientY: number, box: ScreenBox, image: ImageSize): Point | undefined {
  const f = fit(box, image);
  if (!f) return undefined;
  return [(clientX - box.left - f.offsetX) / f.scale, (clientY - box.top - f.offsetY) / f.scale];
}

/** How many image pixels `screenPixels` on screen covers (e.g. the click tolerance for closing a shape). */
export function imagePixels(screenPixels: number, box: ScreenBox, image: ImageSize): number {
  const f = fit(box, image);
  return f ? screenPixels / f.scale : screenPixels;
}

function collectIds(scene: Scene, ids: Set<string>) {
  scene.hotspots.forEach((h) => ids.add(h.id));
  scene.children.forEach((c) => collectIds(c, ids));
}

/** A hotspot id not used anywhere in the project: shape-1, shape-2, ... The target picker (U-605) suggests a better one from the target. */
export function nextHotspotId(config: ProjectConfig): string {
  const ids = new Set<string>();
  collectIds(config.root, ids);
  let n = 1;
  while (ids.has(`shape-${n}`)) n++;
  return `shape-${n}`;
}
