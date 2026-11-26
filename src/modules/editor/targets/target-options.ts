// Pure helpers behind the hotspot target picker: which targets a scene's
// hotspots may point to, and a hotspot id suggested from the chosen target.
// Follows the project tree rules: a typical floor (a scene with floors) uses
// unit suffixes only; any other scene uses child scenes or full unit codes.
import { buildUnitCode, createSceneTree } from "@/modules/domain";
import type { HotspotTarget, ProjectConfig, Scene, TypicalFloors } from "@/modules/schema";

export type TargetKind = "scene" | "unit" | "unitSuffix";

export interface SceneOption {
  id: string;
  title: string;
}

/** A unit code (or a typical floor suffix) and whether a hotspot already places it. */
export interface CodeOption {
  value: string;
  drawn: boolean;
}

export interface TargetOptions {
  /** Target kinds allowed on this scene, in the order the picker shows them. */
  kinds: TargetKind[];
  scenes: SceneOption[];
  /** Unit codes from the units source, not yet drawn first. */
  units: CodeOption[];
  /** Suffixes found in the units source for this typical floor, not yet drawn first. */
  suffixes: CodeOption[];
}

export const targetKindOf = (target: HotspotTarget): TargetKind =>
  "scene" in target ? "scene" : "unit" in target ? "unit" : "unitSuffix";

export const targetValueOf = (target: HotspotTarget): string =>
  "scene" in target ? target.scene : "unit" in target ? target.unit : target.unitSuffix;

export function makeTarget(kind: TargetKind, value: string): HotspotTarget {
  if (kind === "scene") return { scene: value };
  if (kind === "unit") return { unit: value };
  return { unitSuffix: value };
}

const notDrawnFirst = (options: CodeOption[]): CodeOption[] =>
  [...options].sort((a, b) => Number(a.drawn) - Number(b.drawn) || a.value.localeCompare(b.value, "en", { numeric: true }));

const unique = (values: readonly string[]) => [...new Set(values)];

/** The suffix that turns into `code` on one of the typical floors, if any. */
export function suffixOf(code: string, floors: TypicalFloors): string | undefined {
  for (let floor = floors.from; floor <= floors.to; floor++) {
    const [before, after = ""] = floors.unitCode.replaceAll("{floor}", String(floor)).split("{suffix}");
    if (code.length > before.length + after.length && code.startsWith(before) && code.endsWith(after)) {
      const suffix = code.slice(before.length, code.length - after.length);
      if (buildUnitCode(floors.unitCode, floor, suffix) === code) return suffix;
    }
  }
  return undefined;
}

/** What the hotspots of `sceneId` may target, given the unit codes of the units source. */
export function targetOptions(config: ProjectConfig, sceneId: string, unitCodes: readonly string[]): TargetOptions {
  const tree = createSceneTree(config);
  const scene = tree.get(sceneId);
  if (scene.floors) {
    const floors = scene.floors;
    const drawn = new Set(scene.hotspots.flatMap((h) => ("unitSuffix" in h.target ? [h.target.unitSuffix] : [])));
    const suffixes = unique(unitCodes.flatMap((code) => suffixOf(code, floors) ?? []));
    return { kinds: ["unitSuffix"], scenes: [], units: [], suffixes: notDrawnFirst(suffixes.map((value) => ({ value, drawn: drawn.has(value) }))) };
  }
  const drawn = new Set(tree.unitCodes());
  return {
    kinds: ["scene", "unit"],
    scenes: tree.children(sceneId).map((s: Scene) => ({ id: s.id, title: s.title.en })),
    units: notDrawnFirst(unique(unitCodes).map((value) => ({ value, drawn: drawn.has(value) }))),
    suffixes: [],
  };
}

/** Turns any text into an id the schema accepts: lowercase letters, digits and single dashes. */
export function toId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * A hotspot id suggested from its target, unique among `takenIds`:
 * scene "ground" → "ground", unit "G-01" → "g-01", suffix "A" → "unit-a".
 * Adds -2, -3, ... when the id is taken; falls back to "hotspot" for text with no letters or digits.
 */
export function suggestHotspotId(target: HotspotTarget, takenIds: ReadonlySet<string>): string {
  const value = toId(targetValueOf(target));
  const base = !value ? "hotspot" : "unitSuffix" in target ? `unit-${value}` : value;
  let id = base;
  for (let n = 2; takenIds.has(id); n++) id = `${base}-${n}`;
  return id;
}

/** Every hotspot id in the project, so a suggested id never collides with another scene's. */
export function hotspotIds(config: ProjectConfig): Set<string> {
  return new Set(createSceneTree(config).scenes.flatMap((s) => s.hotspots.map((h) => h.id)));
}
