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
export { buildDemoVillaProject, writeProjectFiles } from "./demo-villa/project/demo-villa-project";
export type { ProjectFiles } from "./demo-villa/project/demo-villa-project";
export { DEMO_SLUG } from "./demo-villa/project/project-config";
export { buildXlsx } from "./xlsx/write-xlsx";
export type { XlsxCell } from "./xlsx/write-xlsx";
export { createProject, NewProjectError, PLACEHOLDERS, runNewProjectCli, scaffoldProjectConfig } from "./new-project/create-project";
export type { CreateProjectOptions } from "./new-project/create-project";
export { runUnitsFromCsvCli, unitsXlsxFromCsv } from "./units-csv/units-from-csv";
export type { UnitsCsvResult } from "./units-csv/units-from-csv";
export { projectJsonSchemaText, writeProjectJsonSchema } from "./json-schema/write-json-schema";
