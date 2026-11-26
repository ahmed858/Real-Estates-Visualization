// One visual style per hotspot kind, shared by the scene hotspots and the
// legend swatches so the two always agree. Status is never shown by colour
// alone: reserved units have a dashed outline, sold units a hatch pattern.
//
// Contrast against white (WCAG 1.4.11 asks 3:1 for graphics):
// available #2b8a3e 4.4:1 · reserved #b35c00 4.7:1 · sold #c92a2a 5.5:1 · scene #1864ab 6.1:1.
import type { UnitStatus } from "@/modules/schema";

export interface HotspotStyle {
  /** Fill and outline colour. */
  color: string;
  /** SVG stroke-dasharray for the outline; undefined means a solid line. */
  dash?: string;
  /** Draws diagonal hatching over the fill. */
  hatch?: boolean;
}

export const STATUS_STYLE: Record<UnitStatus | "scene", HotspotStyle> = {
  available: { color: "#2b8a3e" },
  reserved: { color: "#b35c00", dash: "8 5" },
  sold: { color: "#c92a2a", hatch: true },
  scene: { color: "#1864ab" },
};

/** Hotspot fill colours per kind (kept for callers that only need the colour). */
export const HOTSPOT_FILL = Object.fromEntries(
  Object.entries(STATUS_STYLE).map(([kind, style]) => [kind, style.color]),
) as Record<UnitStatus | "scene", string>;

/** Hatch pattern: thin white diagonal lines, in user-space pixels. */
export function HatchPattern({ id, size = 10 }: { id: string; size?: number }) {
  return (
    <pattern id={id} patternUnits="userSpaceOnUse" width={size} height={size} patternTransform="rotate(45)">
      <line x1={0} y1={0} x2={0} y2={size} stroke="#ffffff" strokeWidth={size / 4} strokeOpacity={0.8} />
    </pattern>
  );
}
