// Width limit for a premium view (3D model, panorama), whose canvas is as
// tall as its poster's shape: on the desktop frame the view, its hotspot
// list and the floating legend must fit the stage, so the width shrinks
// until the height does. The phone frame scrolls, so it keeps the full width.
import type { CSSProperties } from "react";
import type { SceneImage } from "@/modules/schema";

/** Desktop only: at most (stage height - room for the top bar, list and legend) x aspect ratio. */
export const PREMIUM_VIEW_CLASS = "md:max-w-[calc((var(--stage-height)_-_18rem)_*_var(--premium-aspect))]";

export function premiumViewStyle({ width, height }: Pick<SceneImage, "width" | "height">): CSSProperties {
  return { "--premium-aspect": String(width / height) } as CSSProperties;
}
