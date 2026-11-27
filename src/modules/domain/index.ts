// Public entry point of the `domain` module.
// Pure business logic (scene tree, floor stats, filters). No React, no I/O.
// Other modules may import ONLY from "@/modules/domain" (this file), never from files inside it.
export { createSceneTree } from "./scene-tree/scene-tree";
export type { ConcreteFloor, PlacedUnit, SceneTree } from "./scene-tree/scene-tree";
export { buildUnitCode } from "./scene-tree/unit-code";
export { computeSceneStats, sumStats } from "./units/scene-stats";
export type { SceneStats } from "./units/scene-stats";
export { bedroomMixOf, computeBedroomMix } from "./units/bedroom-mix";
export { rollUpUnits } from "./units/roll-up";
export type { BedroomCount } from "./units/bedroom-mix";
export { filterUnits, matchesFilter } from "./units/filter-units";
export type { FilterableUnit, RangeFilter, UnitFilter } from "./units/filter-units";
export type { NumberRange } from "./units/range";
export {
  clampToImage,
  closesPolygon,
  distance,
  distanceToSegment,
  isSelfIntersecting,
  nearestEdge,
  nearestVertex,
  polygonArea,
  roundPoint,
  segmentsIntersect,
} from "./geometry/polygon";
export type { ImageSize, NearestEdge, NearestVertex } from "./geometry/polygon";
export {
  checkProjectFit,
  CONFIG_FILE,
  hotspotUnitsExistInSheet,
  missingFile,
  referencedFiles,
  scenesAreReachable,
  sheetScenesMatch,
  sheetUnitsArePlaced,
  UNITS_FILE,
  unitsLabel,
} from "./validation/checks";
export type { FileReference } from "./validation/checks";
export { checkBranding, MIN_STAGE_CONTRAST, MIN_STATUS_DIFFERENCE } from "./validation/brand-checks";
export { errorsOf, formatReport, warningsOf } from "./validation/report";
export type { Finding, Severity, ValidationReport } from "./validation/report";
export { BLACK, colorDifference, contrastRatio, parseHexColor, readableTextColor, relativeLuminance, WHITE } from "./colour/contrast";
export type { Rgb } from "./colour/contrast";
export { STAGE_COLOR, STATUS_COLORS } from "./colour/palette";
export { rotationFramePath, rotationFramePaths } from "./premium/rotation-frames";
