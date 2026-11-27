// Pure helpers for the 3D renderer: which hotspot a mesh of the model is, the
// colour it is tinted with, and whether the browser can draw WebGL at all.
import type { Hotspot, Scene, UnitStatus } from "@/modules/schema";
import { STATUS_STYLE } from "./status-style";

/** Mesh name → hotspot, for the hotspots of a model-3d scene that name a mesh. */
export function meshHotspots(scene: Pick<Scene, "hotspots">): Map<string, Hotspot> {
  const map = new Map<string, Hotspot>();
  for (const h of scene.hotspots) if (h.mesh && !map.has(h.mesh)) map.set(h.mesh, h);
  return map;
}

/**
 * The hotspot a picked object belongs to: the object itself or the nearest
 * named ancestor (glTF exporters often put the name on a parent node).
 */
export function hotspotForObject(object: { name: string; parent: unknown } | null, byMesh: ReadonlyMap<string, Hotspot>): Hotspot | undefined {
  for (let o = object; o; o = o.parent as typeof object) {
    const hit = byMesh.get(o.name);
    if (hit) return hit;
  }
  return undefined;
}

/** Tint of a hotspot's mesh: its unit's status colour, the scene colour for a scene link, none for an unknown unit. */
export function meshTint(hotspot: Hotspot, statusOf: (h: Hotspot) => UnitStatus | undefined): string | undefined {
  if ("scene" in hotspot.target) return STATUS_STYLE.scene.color;
  const status = statusOf(hotspot);
  return status ? STATUS_STYLE[status].color : undefined;
}

/** Whether a WebGL context can be created; false on the server or when the browser or device refuses. */
export function supportsWebGL(createCanvas: () => { getContext: (id: string) => unknown } | undefined = () => (typeof document === "undefined" ? undefined : document.createElement("canvas"))): boolean {
  try {
    const canvas = createCanvas();
    return !!canvas && !!(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}
