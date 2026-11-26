// Adapter: reads a project from projects/<slug>/ on disk: project.json plus its units sheet.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { formatSheetIssue, parseProjectConfig } from "@/modules/schema";
import { ProjectSourceError, type LoadedProject, type ProjectSource } from "./project-source";
import { UnitSourceError, type UnitSource } from "./unit-source";
import { XlsxFileSource } from "./xlsx-file-source";

export const PROJECT_CONFIG_FILE = "project.json";
export const PROJECT_UNITS_FILE = "units.xlsx";

/** A slug is a single folder name: lowercase letters, digits and single dashes. */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const isMissing = (e: unknown) => (e as NodeJS.ErrnoException)?.code === "ENOENT";

export class FileProjectSource implements ProjectSource {
  constructor(
    private readonly projectsDir: string,
    private readonly unitSource: (projectDir: string) => UnitSource = (dir) => new XlsxFileSource(join(dir, PROJECT_UNITS_FILE)),
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
      return { config: parsed.value, units: await this.unitSource(dir).load() };
    } catch (e) {
      if (e instanceof UnitSourceError) throw new ProjectSourceError(slug, "invalid-units", e.issues.map(formatSheetIssue));
      if (isMissing(e)) throw new ProjectSourceError(slug, "invalid-units", [`${PROJECT_UNITS_FILE} not found`]);
      throw e;
    }
  }
}
