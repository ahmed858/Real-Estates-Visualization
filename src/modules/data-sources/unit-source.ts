// The Adapter target: every place unit rows come from (a local .xlsx now,
// Google Sheets later) implements this interface, so callers never depend on the file format.
import type { SheetIssue, UnitRow } from "@/modules/schema";

export interface UnitSource {
  /** Loads and validates every unit row. Rejects with UnitSourceError when the data is invalid. */
  load(): Promise<UnitRow[]>;
}

/** The source was read, but its rows do not pass the units sheet schema. */
export class UnitSourceError extends Error {
  readonly issues: readonly SheetIssue[];

  constructor(source: string, issues: readonly SheetIssue[]) {
    super(`${source}: ${issues.length} problem(s) in the units sheet`);
    this.name = "UnitSourceError";
    this.issues = issues;
  }
}
