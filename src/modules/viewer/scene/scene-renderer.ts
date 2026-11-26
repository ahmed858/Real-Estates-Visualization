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
}

export type SceneRenderer = ComponentType<SceneRendererProps>;

export type SceneRendererRegistry = Partial<Record<SceneRendererType | (string & {}), SceneRenderer>>;
