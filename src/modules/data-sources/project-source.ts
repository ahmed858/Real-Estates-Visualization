// The Adapter target for whole projects: config plus unit rows. The viewer
// depends on this interface, never on where or how a project is stored.
import type { ProjectConfig, UnitRow } from "@/modules/schema";
import type { StaleUnits } from "./unit-source";

export interface LoadedProject {
  config: ProjectConfig;
  units: UnitRow[];
  /** Present when the units are the last good copy because the latest read failed. */
  unitsStale?: StaleUnits;
}

export interface ProjectSource {
  /** Loads and validates one project. Rejects with ProjectSourceError for a missing or invalid project. */
  load(slug: string): Promise<LoadedProject>;
}

export type ProjectSourceErrorKind = "not-found" | "invalid-config" | "invalid-units";

export class ProjectSourceError extends Error {
  readonly kind: ProjectSourceErrorKind;
  /** Human-readable problems, e.g. "root.hotspots[0].points: ..." or "row 4, price: ...". */
  readonly issues: readonly string[];

  constructor(slug: string, kind: ProjectSourceErrorKind, issues: readonly string[] = []) {
    super(`project "${slug}": ${kind}${issues.length > 0 ? ` (${issues.length} problem(s))` : ""}`);
    this.name = "ProjectSourceError";
    this.kind = kind;
    this.issues = issues;
  }
}
