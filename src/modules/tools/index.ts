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
  FloorId,
  Opening,
  Room,
  UnitGeometry,
  VillaGeometry,
  Wall,
} from "./demo-villa/geometry/types";
export { floorPlanFrame, PLAN_SCALE } from "./demo-villa/svg/frame";
export type { PlanFrame } from "./demo-villa/svg/frame";
export { renderFloorPlanSvg } from "./demo-villa/svg/floor-plan-svg";
export { buildFacadeGeometry } from "./demo-villa/facade/facade-geometry";
export type { ElevationOpening, FacadeBand, FacadeGeometry } from "./demo-villa/facade/facade-geometry";
export { facadeBandPolygons, facadeFrame, renderFacadeSvg } from "./demo-villa/facade/facade-svg";
export type { FacadeFrame } from "./demo-villa/facade/facade-svg";
