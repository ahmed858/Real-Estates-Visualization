// Adapter: reads a project from projects/<slug>/ on disk: project.json plus its units sheet.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { DEFAULT_UNITS_SOURCE, formatSheetIssue, parseProjectConfig } from "@/modules/schema";
import { ProjectSourceError, type LoadedProject, type ProjectSource } from "./project-source";
import { UnitSourceError, UnitSourceReadError } from "./unit-source";
import { createUnitSource, PROJECT_UNITS_FILE, UnsupportedUnitSourceError, type UnitSourceFactory } from "./unit-source-factory";

export const PROJECT_CONFIG_FILE = "project.json";

/** A slug is a single folder name: lowercase letters, digits and single dashes. */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const isMissing = (e: unknown) => (e as NodeJS.ErrnoException)?.code === "ENOENT";

export class FileProjectSource implements ProjectSource {
  constructor(
    private readonly projectsDir: string,
    private readonly unitSource: UnitSourceFactory = createUnitSource,
  ) {}

  async load(slug: string): Promise<LoadedProject> {
    if (!SLUG.test(slug)) throw new ProjectSourceError(slug, "not-found");
    const dir = join(this.projectsDir, slug);

    let text: string;
    try {
      text = await readFile(join(dir, PROJECT_CONFIG_FILE), "utf8");
    } catch (e) {
      if (isMissing(e)) throw new ProjectSourceError(slug, "not-found");
      throw e;
    }
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch (e) {
      throw new ProjectSourceError(slug, "invalid-config", [`${PROJECT_CONFIG_FILE} is not valid JSON: ${(e as Error).message}`]);
    }
    const parsed = parseProjectConfig(raw);
    if (!parsed.ok) {
      throw new ProjectSourceError(slug, "invalid-config", parsed.errors.map((err) => `${err.path}: ${err.message}`));
    }

    try {
      const source = this.unitSource(parsed.value.units ?? DEFAULT_UNITS_SOURCE, dir);
      const { rows, stale } = source.loadWithStatus ? await source.loadWithStatus() : { rows: await source.load(), stale: undefined };
      return { config: parsed.value, units: rows, ...(stale && { unitsStale: stale }) };
    } catch (e) {
      if (e instanceof UnitSourceReadError) throw new ProjectSourceError(slug, "invalid-units", [e.message]);
      if (e instanceof UnsupportedUnitSourceError) throw new ProjectSourceError(slug, "invalid-units", [`units.source: ${e.message}`]);
      if (e instanceof UnitSourceError) throw new ProjectSourceError(slug, "invalid-units", e.issues.map(formatSheetIssue));
      if (isMissing(e)) throw new ProjectSourceError(slug, "invalid-units", [`${PROJECT_UNITS_FILE} not found`]);
      throw e;
    }
  }
}
