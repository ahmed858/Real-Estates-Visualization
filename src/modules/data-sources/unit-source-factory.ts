// Factory Method: turns the `units` block of project.json into the UnitSource
// adapter that reads it. The only place that knows which sources exist, so
// adding one (Google Sheet in U-502) never touches FileProjectSource or the viewer.
import { join } from "node:path";
import type { UnitsSource } from "@/modules/schema";
import type { UnitSource } from "./unit-source";
import { XlsxFileSource } from "./xlsx-file-source";

export const PROJECT_UNITS_FILE = "units.xlsx";

export type UnitSourceFactory = (units: UnitsSource, projectDir: string) => UnitSource;

/** The config names a source this build cannot read yet. */
export class UnsupportedUnitSourceError extends Error {
  constructor(readonly source: UnitsSource["source"]) {
    super(`units source "${source}" is not supported yet`);
    this.name = "UnsupportedUnitSourceError";
  }
}

export const createUnitSource: UnitSourceFactory = (units, projectDir) => {
  switch (units.source) {
    case "xlsx":
      return new XlsxFileSource(join(projectDir, PROJECT_UNITS_FILE));
    case "google-sheet":
      // GoogleSheetCsvSource arrives in U-502.
      throw new UnsupportedUnitSourceError(units.source);
  }
};
