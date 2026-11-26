// Public entry point of the `domain` module.
// Pure business logic (scene tree, floor stats, filters). No React, no I/O.
// Other modules may import ONLY from "@/modules/domain" (this file), never from files inside it.
export { createSceneTree } from "./scene-tree/scene-tree";
export type { ConcreteFloor, PlacedUnit, SceneTree } from "./scene-tree/scene-tree";
export { buildUnitCode } from "./scene-tree/unit-code";
export { computeSceneStats, sumStats } from "./units/scene-stats";
export type { SceneStats } from "./units/scene-stats";
export { bedroomMixOf, computeBedroomMix } from "./units/bedroom-mix";
export type { BedroomCount } from "./units/bedroom-mix";
export { filterUnits, matchesFilter } from "./units/filter-units";
export type { FilterableUnit, RangeFilter, UnitFilter } from "./units/filter-units";
export type { NumberRange } from "./units/range";
