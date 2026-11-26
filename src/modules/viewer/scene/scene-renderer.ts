// Strategy: one renderer per scene `type`. The viewer asks the registry for the
// renderer of a scene and never depends on a concrete one, so 360° and 3D
// renderers can be added later without changing the callers or the data.
import type { ComponentType } from "react";
import type { Hotspot, Scene, SceneRendererType, UnitStatus } from "@/modules/schema";

export interface SceneRendererProps {
  scene: Scene;
  /** URL of the scene image (e.g. "/files/demo-villa/images/facade.svg"). */
  imageUrl: string;
  /** Status of the unit a hotspot opens; undefined for scene hotspots or unknown units. */
  unitStatusOf: (hotspot: Hotspot) => UnitStatus | undefined;
  /** Accessible name of a hotspot, e.g. "Unit G-01, available" or "Ground floor". */
  hotspotLabel: (hotspot: Hotspot) => string;
  /** Called when a hotspot is clicked or activated with the keyboard. */
  onSelect?: (hotspot: Hotspot) => void;
  /** Called with the hotspot under the pointer or keyboard focus, and with null when it leaves. */
  onHover?: (hotspot: Hotspot | null) => void;
  /**
   * While a filter is active: "match" keeps a hotspot visible in its colour,
   * "dim" darkens it. Undefined (or no callback) means the normal look.
   */
  hotspotEmphasis?: (hotspot: Hotspot) => HotspotEmphasis | undefined;
  /** Short text shown on a hotspot, e.g. how many matching units lie below a scene hotspot. */
  hotspotBadge?: (hotspot: Hotspot) => string | undefined;
}

export type HotspotEmphasis = "match" | "dim";

export type SceneRenderer = ComponentType<SceneRendererProps>;

export type SceneRendererRegistry = Partial<Record<SceneRendererType | (string & {}), SceneRenderer>>;
