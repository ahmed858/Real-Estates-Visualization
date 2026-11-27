// Public entry point of the `schema` module.
// Project and units-sheet data shapes, plus validation. Depends on nothing internal.
// Other modules may import ONLY from "@/modules/schema" (this file), never from files inside it.
export {
  DEFAULT_SCENE_RENDERER_TYPE,
  isProjectPublished,
  PROJECT_SCHEMA_VERSION,
  SCENE_KINDS,
  SCENE_RENDERER_TYPES,
  projectConfigShapeSchema,
  sceneSchema,
} from "./project/project-schema";
export type {
  Hotspot,
  HotspotTarget,
  Point,
  ProjectConfig,
  ProjectConfigInput,
  ProjectInfo,
  Scene,
  SceneImage,
  SceneInput,
  SceneKind,
  SceneRendererType,
  TypicalFloors,
} from "./project/project-schema";
export {
  DEFAULT_REFRESH_SECONDS,
  DEFAULT_UNITS_SOURCE,
  MAX_REFRESH_SECONDS,
  MIN_REFRESH_SECONDS, UNITS_SOURCE_KINDS, unitsSourceSchema } from "./project/units-source";
export type { UnitsSource, UnitsSourceKind } from "./project/units-source";
export { LOCALES } from "./project/primitives";
export { formatPath, parseProjectConfig } from "./project/parse-project-config";
export type { ParseResult, ValidationError } from "./project/parse-project-config";
export {
  OPTIONAL_UNIT_COLUMNS,
  REQUIRED_UNIT_COLUMNS,
  UNIT_COLUMNS,
  formatSheetIssue,
  parseUnitsSheet,
} from "./units/units-sheet";
export type { SheetIssue, SheetParseResult, SheetTable, UnitColumn, UnitRow } from "./units/units-sheet";
export { STATUS_SPELLINGS, UNIT_STATUSES, normaliseStatus } from "./units/status";
export type { UnitStatus } from "./units/status";
