// Validates unknown input (e.g. parsed JSON) as a project config.
import type { z } from "zod";
import { projectConfigShapeSchema, type ProjectConfig } from "./project-schema";
import { checkTreeRules } from "./tree-rules";

export interface ValidationError {
  /** Dotted path from the config root, e.g. "root.children[0].hotspots[1].target.scene". */
  path: string;
  message: string;
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; errors: ValidationError[] };

/** Formats a path array as "a.b[0].c". An empty path is shown as "(root)". */
export function formatPath(path: readonly PropertyKey[]): string {
  if (path.length === 0) return "(root)";
  return path
    .map((part, i) => (typeof part === "number" ? `[${part}]` : `${i === 0 ? "" : "."}${String(part)}`))
    .join("");
}

function fromZodIssues(issues: z.core.$ZodIssue[]): ValidationError[] {
  return issues.map((issue) => ({ path: formatPath(issue.path), message: issue.message }));
}

/**
 * Checks the shape first, then the cross-field tree rules.
 * Never throws; returns every error found with its path and reason.
 */
export function parseProjectConfig(input: unknown): ParseResult<ProjectConfig> {
  const shape = projectConfigShapeSchema.safeParse(input);
  if (!shape.success) return { ok: false, errors: fromZodIssues(shape.error.issues) };

  const ruleIssues = checkTreeRules(shape.data);
  if (ruleIssues.length > 0) {
    return { ok: false, errors: ruleIssues.map((i) => ({ path: formatPath(i.path), message: i.message })) };
  }
  return { ok: true, value: shape.data };
}
