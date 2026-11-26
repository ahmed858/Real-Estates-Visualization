// Validates one client project folder: config, units sheet, and how they fit together.
import { access, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { DEFAULT_UNITS_SOURCE, parseProjectConfig, unitsSourceSchema, type UnitRow, type UnitsSource } from "@/modules/schema";
import { createSceneTree } from "@/modules/domain";
import {
  createUnitSourceFactory,
  UnitSourceError,
  UnitSourceReadError,
  UnsupportedUnitSourceError,
  type UnitSource,
  type UnitSourceFactory,
} from "@/modules/data-sources";
import {
  CONFIG_FILE,
  UNITS_FILE,
  hotspotUnitsExistInSheet,
  referencedFiles,
  scenesAreReachable,
  sheetScenesMatch,
  sheetUnitsArePlaced,
} from "./checks";
import type { Finding, ValidationReport } from "./report";

export interface ValidateOptions {
  /** Creates the unit source from the config's `units` block. Defaults to the app's factory. */
  unitSource?: UnitSourceFactory;
}

/** How findings name where the rows came from. */
export function unitsLabel(units: UnitsSource): string {
  return units.source === "xlsx" ? UNITS_FILE : "Google Sheet";
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

async function exists(path: string): Promise<boolean> {
  return access(path).then(
    () => true,
    () => false,
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
    const missing = units.source === "xlsx" && !(await exists(join(dir, UNITS_FILE)));
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
    findings.push(...scenesAreReachable(tree));
    const units = sheet.units ?? [];
    if (sheet.units) {
      findings.push(...hotspotUnitsExistInSheet(tree, units, label), ...sheetUnitsArePlaced(tree, units, label), ...sheetScenesMatch(tree, units, label));
    }
    for (const ref of referencedFiles(config, tree, units, label)) {
      if (!(await exists(join(dir, ref.path)))) {
        findings.push({ severity: "error", file: ref.file, location: ref.location, message: `file "${ref.path}" does not exist` });
      }
    }
  }

  const slug = config?.project.slug ?? basename(dir);
  return { slug, findings };
}
