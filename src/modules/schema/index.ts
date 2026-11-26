// Public entry point of the `schema` module.
// Project and units-sheet data shapes, plus validation. Depends on nothing internal.
// Other modules may import ONLY from "@/modules/schema" (this file), never from files inside it.
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
