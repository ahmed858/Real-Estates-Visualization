// Public entry point of the `domain` module.
// Pure business logic (scene tree, floor stats, filters). No React, no I/O.
// Other modules may import ONLY from "@/modules/domain" (this file), never from files inside it.
export { createSceneTree } from "./scene-tree/scene-tree";
export type { ConcreteFloor, PlacedUnit, SceneTree } from "./scene-tree/scene-tree";
export { buildUnitCode } from "./scene-tree/unit-code";
