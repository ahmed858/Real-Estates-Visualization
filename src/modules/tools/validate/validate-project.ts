// Validates one client project folder: config, units sheet, and how they fit together.
import { readFile, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import { DEFAULT_UNITS_SOURCE, parseProjectConfig, unitsSourceSchema, type UnitRow, type UnitsSource } from "@/modules/schema";
import { checkProjectFit, CONFIG_FILE, createSceneTree, formatMegabytes, missingFile, projectFileSizeLimit, referencedFiles, UNITS_FILE, unitsLabel, type Finding, type ValidationReport } from "@/modules/domain";
import {
  createUnitSourceFactory,
  UnitSourceError,
  UnitSourceReadError,
  UnsupportedUnitSourceError,
  type UnitSource,
  type UnitSourceFactory,
} from "@/modules/data-sources";

export interface ValidateOptions {
  /** Creates the unit source from the config's `units` block. Defaults to the app's factory. */
  unitSource?: UnitSourceFactory;
}


/**
 * The units source the config asks for: the `units` block when it is valid,
 * units.xlsx when there is none, or undefined when the block itself is invalid
 * (that error is already reported against project.json).
 */
function configuredUnits(config: unknown): UnitsSource | undefined {
  const block = typeof config === "object" && config !== null ? (config as { units?: unknown }).units : undefined;
  if (block === undefined) return DEFAULT_UNITS_SOURCE;
  const parsed = unitsSourceSchema.safeParse(block);
  return parsed.success ? parsed.data : undefined;
}

/** Size in bytes of a file, or undefined when it does not exist or is not a file. */
async function fileSize(path: string): Promise<number | undefined> {
  return stat(path).then(
    (s) => (s.isFile() ? s.size : undefined),
    () => undefined,
  );
}

async function readConfig(dir: string): Promise<{ config?: unknown; findings: Finding[] }> {
  let text: string;
  try {
    text = await readFile(join(dir, CONFIG_FILE), "utf8");
  } catch {
    return { findings: [{ severity: "error", file: CONFIG_FILE, message: "file not found" }] };
  }
  try {
    return { config: JSON.parse(text), findings: [] };
  } catch (e) {
    return { findings: [{ severity: "error", file: CONFIG_FILE, message: `not valid JSON: ${(e as Error).message}` }] };
  }
}

async function readUnits(dir: string, units: UnitsSource, factory: UnitSourceFactory): Promise<{ units?: UnitRow[]; findings: Finding[] }> {
  const file = unitsLabel(units);
  let source: UnitSource;
  try {
    source = factory(units, dir);
    return { units: await source.load(), findings: [] };
  } catch (e) {
    if (e instanceof UnitSourceError) {
      return {
        findings: e.issues.map((i) => ({
          severity: "error" as const,
          file,
          location: `row ${i.row}${i.column ? `, ${i.column}` : ""}`,
          message: i.message,
        })),
      };
    }
    if (e instanceof UnitSourceReadError || e instanceof UnsupportedUnitSourceError) {
      return { findings: [{ severity: "error", file, message: e.message }] };
    }
    const missing = units.source === "xlsx" && (await fileSize(join(dir, UNITS_FILE))) === undefined;
    return {
      findings: [{ severity: "error", file, message: missing ? "file not found" : `cannot be read: ${(e as Error).message}` }],
    };
  }
}

/** Runs every check and returns all findings; never throws for bad project data. */
export async function validateProject(dir: string, options: ValidateOptions = {}): Promise<ValidationReport> {
  const findings: Finding[] = [];
  const raw = await readConfig(dir);
  findings.push(...raw.findings);

  const parsed = raw.config === undefined ? undefined : parseProjectConfig(raw.config);
  if (parsed && !parsed.ok) {
    findings.push(...parsed.errors.map((e) => ({ severity: "error" as const, file: CONFIG_FILE, location: e.path, message: e.message })));
  }

  const unitsSource = raw.config === undefined ? DEFAULT_UNITS_SOURCE : configuredUnits(raw.config);
  const label = unitsLabel(unitsSource ?? DEFAULT_UNITS_SOURCE);
  const sheet = unitsSource ? await readUnits(dir, unitsSource, options.unitSource ?? createUnitSourceFactory()) : { findings: [] };
  findings.push(...sheet.findings);

  const config = parsed?.ok ? parsed.value : undefined;
  if (config) {
    const tree = createSceneTree(config);
    findings.push(...checkProjectFit(tree, sheet.units, label, config.project.branding));
    const units = sheet.units ?? [];
    for (const ref of referencedFiles(config, tree, units, label)) {
      const size = await fileSize(join(dir, ref.path));
      if (size === undefined) {
        findings.push(missingFile(ref));
        continue;
      }
      const limit = projectFileSizeLimit(ref.path);
      if (limit && size > limit.bytes) {
        findings.push({ severity: "error", file: ref.file, location: ref.location, message: `file "${ref.path}" is ${formatMegabytes(size)}; ${limit.label} may be at most ${formatMegabytes(limit.bytes)}` });
      }
    }
  }

  const slug = config?.project.slug ?? basename(dir);
  return { slug, findings };
}
