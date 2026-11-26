// The Adapter target: every place unit rows come from (a local .xlsx now,
// Google Sheets later) implements this interface, so callers never depend on the file format.
import type { SheetIssue, UnitRow } from "@/modules/schema";

export interface UnitSource {
  /** Loads and validates every unit row. Rejects with UnitSourceError when the data is invalid. */
  load(): Promise<UnitRow[]>;
  /**
   * Optional: like load(), but may answer with older rows plus a notice when
   * the latest read failed. Sources without a fallback leave it out.
   */
  loadWithStatus?(): Promise<LoadedUnits>;
}

/** The latest read failed; these rows are the last ones that passed validation. */
export interface StaleUnits {
  /** When the served rows were read (ms since the epoch). */
  lastGoodAt: number;
  /** Why the latest read failed, e.g. "row 4, price: must be a number". */
  problems: readonly string[];
}

export interface LoadedUnits {
  rows: UnitRow[];
  stale?: StaleUnits;
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

export type UnitSourceReadErrorKind = "not-shared" | "not-found" | "http" | "network";

/** The source could not be read at all (e.g. a Google Sheet that is not shared, or a network error). */
export class UnitSourceReadError extends Error {
  readonly kind: UnitSourceReadErrorKind;

  constructor(source: string, kind: UnitSourceReadErrorKind, detail: string) {
    super(`${source}: ${detail}`);
    this.name = "UnitSourceReadError";
    this.kind = kind;
  }
}
