// Read-only index over a validated scene tree (the Composite from the schema).
// Built once per config; answers lookups without re-walking the tree.
import type { ProjectConfig, Scene } from "@/modules/schema";
import { buildUnitCode } from "./unit-code";

/** A unit placed by a hotspot on a concrete floor. */
export interface PlacedUnit {
  code: string;
  sceneId: string;
  hotspotId: string;
  /** Concrete floor number, when the scene is a typical floor. */
  floor?: number;
}

/** One real floor served by a typical floor plan. */
export interface ConcreteFloor {
  sceneId: string;
  floor: number;
  units: PlacedUnit[];
}

export interface SceneTree {
  readonly root: Scene;
  /** Every scene, parents before children (depth-first, in config order). */
  readonly scenes: readonly Scene[];
  has(id: string): boolean;
  /** Returns the scene or throws if the id is unknown. */
  get(id: string): Scene;
  children(id: string): readonly Scene[];
  /** The parent scene, or undefined for the root. */
  parent(id: string): Scene | undefined;
  /** Scenes from the root down to and including the given scene. */
  breadcrumbs(id: string): Scene[];
  /** Concrete floors of a typical floor scene; empty for any other scene. */
  concreteFloors(id: string): ConcreteFloor[];
  /** Every unit placed by a hotspot, typical floors expanded, in tree order. */
  placedUnits(): PlacedUnit[];
  /** Distinct unit codes referenced by hotspots, typical floors expanded. */
  unitCodes(): string[];
}

function unitsOnScene(scene: Scene): PlacedUnit[] {
  if (scene.floors) {
    return expandTypicalFloor(scene).flatMap((f) => f.units);
  }
  return scene.hotspots.flatMap((h) =>
    "unit" in h.target ? [{ code: h.target.unit, sceneId: scene.id, hotspotId: h.id }] : [],
  );
}

function expandTypicalFloor(scene: Scene): ConcreteFloor[] {
  const range = scene.floors;
  if (!range) return [];
  const floors: ConcreteFloor[] = [];
  for (let floor = range.from; floor <= range.to; floor++) {
    const units = scene.hotspots.flatMap((h) =>
      "unitSuffix" in h.target
        ? [{ code: buildUnitCode(range.unitCode, floor, h.target.unitSuffix), sceneId: scene.id, hotspotId: h.id, floor }]
        : [],
    );
    floors.push({ sceneId: scene.id, floor, units });
  }
  return floors;
}

class IndexedSceneTree implements SceneTree {
  readonly scenes: readonly Scene[];
  private readonly byId = new Map<string, Scene>();
  private readonly parentOf = new Map<string, Scene>();

  constructor(readonly root: Scene) {
    const ordered: Scene[] = [];
    const visit = (scene: Scene, parent?: Scene) => {
      if (this.byId.has(scene.id)) throw new Error(`duplicate scene id "${scene.id}"`);
      this.byId.set(scene.id, scene);
      if (parent) this.parentOf.set(scene.id, parent);
      ordered.push(scene);
      scene.children.forEach((child) => visit(child, scene));
    };
    visit(root);
    this.scenes = ordered;
  }

  has(id: string): boolean {
    return this.byId.has(id);
  }

  get(id: string): Scene {
    const scene = this.byId.get(id);
    if (!scene) throw new Error(`unknown scene "${id}"`);
    return scene;
  }

  children(id: string): readonly Scene[] {
    return this.get(id).children;
  }

  parent(id: string): Scene | undefined {
    this.get(id);
    return this.parentOf.get(id);
  }

  breadcrumbs(id: string): Scene[] {
    const path: Scene[] = [];
    for (let scene: Scene | undefined = this.get(id); scene; scene = this.parentOf.get(scene.id)) {
      path.unshift(scene);
    }
    return path;
  }

  concreteFloors(id: string): ConcreteFloor[] {
    return expandTypicalFloor(this.get(id));
  }

  placedUnits(): PlacedUnit[] {
    return this.scenes.flatMap(unitsOnScene);
  }

  unitCodes(): string[] {
    return [...new Set(this.placedUnits().map((u) => u.code))];
  }
}

/** Builds the index for a config already validated by parseProjectConfig. */
export function createSceneTree(config: Pick<ProjectConfig, "root">): SceneTree {
  return new IndexedSceneTree(config.root);
}
