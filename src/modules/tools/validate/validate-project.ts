// Validates one client project folder: config, units sheet, and how they fit together.
import { access, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { parseProjectConfig, type UnitRow } from "@/modules/schema";
import { createSceneTree } from "@/modules/domain";
import { UnitSourceError, XlsxFileSource, type UnitSource } from "@/modules/data-sources";
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
  /** Creates the unit source for a project folder. Defaults to reading units.xlsx. */
  unitSource?: (projectDir: string) => UnitSource;
}

const defaultUnitSource = (dir: string): UnitSource => new XlsxFileSource(join(dir, UNITS_FILE));

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

async function readUnits(dir: string, source: UnitSource): Promise<{ units?: UnitRow[]; findings: Finding[] }> {
  try {
    return { units: await source.load(), findings: [] };
  } catch (e) {
    if (e instanceof UnitSourceError) {
      return {
        findings: e.issues.map((i) => ({
          severity: "error" as const,
          file: UNITS_FILE,
          location: `row ${i.row}${i.column ? `, ${i.column}` : ""}`,
          message: i.message,
        })),
      };
    }
    const missing = !(await exists(join(dir, UNITS_FILE)));
    return {
      findings: [{ severity: "error", file: UNITS_FILE, message: missing ? "file not found" : `cannot be read: ${(e as Error).message}` }],
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

  const sheet = await readUnits(dir, (options.unitSource ?? defaultUnitSource)(dir));
  findings.push(...sheet.findings);

  const config = parsed?.ok ? parsed.value : undefined;
  if (config) {
    const tree = createSceneTree(config);
    findings.push(...scenesAreReachable(tree));
    const units = sheet.units ?? [];
    if (sheet.units) {
      findings.push(...hotspotUnitsExistInSheet(tree, units), ...sheetUnitsArePlaced(tree, units), ...sheetScenesMatch(tree, units));
    }
    for (const ref of referencedFiles(config, tree, units)) {
      if (!(await exists(join(dir, ref.path)))) {
        findings.push({ severity: "error", file: ref.file, location: ref.location, message: `file "${ref.path}" does not exist` });
      }
    }
  }

  const slug = config?.project.slug ?? basename(dir);
  return { slug, findings };
}
