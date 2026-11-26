// Public entry point of the `tools` module.
// Node scripts: data validation, demo project generation.
// Other modules may import ONLY from "@/modules/tools" (this file), never from files inside it.
export { validateProject } from "./validate/validate-project";
export type { ValidateOptions } from "./validate/validate-project";
export { errorsOf, formatReport, warningsOf } from "./validate/report";
export type { Finding, Severity, ValidationReport } from "./validate/report";
export { runValidateCli } from "./validate/cli";
export { buildVillaGeometry } from "./demo-villa/geometry/villa-geometry";
export type {
  CommonArea,
  FloorGeometry,
  Opening,
  Room,
  UnitGeometry,
  VillaGeometry,
  Wall,
} from "./demo-villa/geometry/types";
