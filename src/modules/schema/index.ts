// Public entry point of the `schema` module.
// Project and units-sheet data shapes, plus validation. Depends on nothing internal.
// Other modules may import ONLY from "@/modules/schema" (this file), never from files inside it.
export {
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
export { LOCALES } from "./project/primitives";
export { formatPath, parseProjectConfig } from "./project/parse-project-config";
export type { ParseResult, ValidationError } from "./project/parse-project-config";
