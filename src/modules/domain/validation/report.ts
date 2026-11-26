// The validation report: a flat list of problems, each tied to a file and a location in it.

export type Severity = "error" | "warning";

export interface Finding {
  severity: Severity;
  /** File the problem is in, relative to the project folder (e.g. "project.json", "units.xlsx"). */
  file: string;
  /** Where in the file: a config path ("root.hotspots[0]") or a sheet location ("row 4, price"). */
  location?: string;
  message: string;
  /** The scene the problem is on, when it has one (the editor links to it). */
  sceneId?: string;
  /** The hotspot the problem is on, when it has one. */
  hotspotId?: string;
}

export interface ValidationReport {
  slug: string;
  findings: Finding[];
}

export const errorsOf = (report: ValidationReport) => report.findings.filter((f) => f.severity === "error");
export const warningsOf = (report: ValidationReport) => report.findings.filter((f) => f.severity === "warning");

/** Human-readable report; one line per finding, errors first. */
export function formatReport(report: ValidationReport): string {
  const errors = errorsOf(report);
  const warnings = warningsOf(report);
  const line = (f: Finding) => `  ${f.file}${f.location ? ` (${f.location})` : ""}: ${f.message}`;
  const out = [`Project "${report.slug}"`];
  if (errors.length > 0) out.push(`Errors (${errors.length}):`, ...errors.map(line));
  if (warnings.length > 0) out.push(`Warnings (${warnings.length}):`, ...warnings.map(line));
  if (errors.length === 0) out.push(warnings.length === 0 ? "OK: no problems found." : "OK with warnings.");
  return out.join("\n");
}
