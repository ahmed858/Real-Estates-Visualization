import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { FileProjectSource, ProjectSourceError, UnitSourceReadError, type ProjectSource } from "./index";

const projectsDir = fileURLToPath(new URL("../../../projects", import.meta.url));

/** Copies demo-villa into a temporary projects folder and lets a test break one thing. */
async function brokenCopy(change: (dir: string) => Promise<void>): Promise<ProjectSource> {
  const root = await mkdtemp(join(tmpdir(), "projects-"));
  await cp(join(projectsDir, "demo-villa"), join(root, "demo-villa"), { recursive: true });
  await change(join(root, "demo-villa"));
  return new FileProjectSource(root);
}

async function errorOf(load: Promise<unknown>): Promise<ProjectSourceError> {
  const error = await load.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ProjectSourceError);
  return error as ProjectSourceError;
}

describe("FileProjectSource", () => {
  it("loads the demo villa: config and units", async () => {
    const project = await new FileProjectSource(projectsDir).load("demo-villa");
    expect(project.config.project.slug).toBe("demo-villa");
    expect(project.config.root.children.map((c) => c.id)).toEqual(["ground", "first", "roof"]);
    expect(project.units.map((u) => [u.code, u.status])).toEqual([
      ["G-01", "available"],
      ["G-02", "reserved"],
      ["F-01", "sold"],
      ["F-02", "available"],
      ["R-01", "reserved"],
    ]);
  });

  it.each(["missing-project", "../projects", "Demo-Villa", ""])("reports %j as not found", async (slug) => {
    const error = await errorOf(new FileProjectSource(projectsDir).load(slug));
    expect(error.kind).toBe("not-found");
  });

  it("reports invalid JSON", async () => {
    const source = await brokenCopy((dir) => writeFile(join(dir, "project.json"), "{ nope"));
    const error = await errorOf(source.load("demo-villa"));
    expect(error.kind).toBe("invalid-config");
    expect(error.issues[0]).toContain("not valid JSON");
  });

  it("reports an invalid config with paths", async () => {
    const source = await brokenCopy((dir) => writeFile(join(dir, "project.json"), JSON.stringify({ schemaVersion: 1 })));
    const error = await errorOf(source.load("demo-villa"));
    expect(error.kind).toBe("invalid-config");
    expect(error.issues).toContainEqual(expect.stringMatching(/^project: /));
  });

  it("reports a missing units sheet", async () => {
    const source = await brokenCopy((dir) => rm(join(dir, "units.xlsx")));
    const error = await errorOf(source.load("demo-villa"));
    expect(error).toMatchObject({ kind: "invalid-units", issues: ["units.xlsx not found"] });
  });

  it("reports invalid unit rows with row and column", async () => {
    const fixture = fileURLToPath(new URL("./__fixtures__/units-invalid-row.xlsx", import.meta.url));
    const source = await brokenCopy((dir) => cp(fixture, join(dir, "units.xlsx")));
    const error = await errorOf(source.load("demo-villa"));
    expect(error.kind).toBe("invalid-units");
    expect(error.issues).toContain("row 3, area_m2: must be a number");
  });
});

describe("FileProjectSource: units source from project.json", () => {
  async function withUnits(units: unknown, factory?: ConstructorParameters<typeof FileProjectSource>[1]) {
    const root = await mkdtemp(join(tmpdir(), "projects-"));
    await cp(join(projectsDir, "demo-villa"), join(root, "demo-villa"), { recursive: true });
    const file = join(root, "demo-villa", "project.json");
    const config = JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;
    await writeFile(file, JSON.stringify({ ...config, units }));
    return new FileProjectSource(root, factory);
  }

  it("uses units.xlsx when the config says xlsx", async () => {
    const project = await (await withUnits({ source: "xlsx" })).load("demo-villa");
    expect(project.units).toHaveLength(5);
  });

  it("passes the configured source to the factory, defaulting to xlsx", async () => {
    const seen: unknown[] = [];
    const factory = (units: unknown) => {
      seen.push(units);
      return { load: async () => [] };
    };
    await new FileProjectSource(projectsDir, factory).load("demo-villa");
    const sheet = { source: "google-sheet", sheetId: "x".repeat(44) };
    await (await withUnits(sheet, factory)).load("demo-villa");
    expect(seen).toEqual([{ source: "xlsx" }, { ...sheet, gid: "0", refreshSeconds: 60 }]);
  });

  it("reports a sheet that cannot be read as invalid units", async () => {
    const factory = () => ({
      load: async () => {
        throw new UnitSourceReadError("Google Sheet x", "not-shared", "the sheet is not shared");
      },
    });
    const error = await errorOf(new FileProjectSource(projectsDir, factory).load("demo-villa"));
    expect(error).toMatchObject({ kind: "invalid-units", issues: ["Google Sheet x: the sheet is not shared"] });
  });

  it("reports a bad units block as an invalid config", async () => {
    const error = await errorOf((await withUnits({ source: "airtable" })).load("demo-villa"));
    expect(error.kind).toBe("invalid-config");
    expect(error.issues[0]).toMatch(/^units\.source: /);
  });
});

describe("FileProjectSource: stale units", () => {
  it("passes a stale notice from the unit source on to the loaded project", async () => {
    const stale = { lastGoodAt: 1_000, problems: ["row 4, price: must be a number"] };
    const factory = () => ({ load: async () => [], loadWithStatus: async () => ({ rows: [], stale }) });
    const project = await new FileProjectSource(projectsDir, factory).load("demo-villa");
    expect(project.unitsStale).toEqual(stale);
  });

  it("has no notice for fresh units", async () => {
    const project = await new FileProjectSource(projectsDir).load("demo-villa");
    expect(project).not.toHaveProperty("unitsStale");
  });
});

describe("FileProjectSource.list", () => {
  it("lists every project with a valid config, sorted by slug, without reading unit sheets", async () => {
    const neverLoaded = () => {
      throw new Error("list() must not read unit sheets");
    };
    const list = await new FileProjectSource(projectsDir, neverLoaded).list();
    expect(list.map((p) => p.slug)).toEqual(["demo-residence", "demo-villa"]);
    expect(list[1].name.en).toBeTruthy();
  });

  it("leaves out invalid projects, stray files and folders without a config", async () => {
    const source = await brokenCopy(async () => {});
    const root = join((source as unknown as { projectsDir: string }).projectsDir);
    await cp(join(root, "demo-villa"), join(root, "broken"), { recursive: true });
    await writeFile(join(root, "broken", "project.json"), "{");
    await cp(join(root, "demo-villa", "images"), join(root, "no-config"), { recursive: true });
    await writeFile(join(root, "notes.txt"), "x");
    expect((await source.list()).map((p) => p.slug)).toEqual(["demo-villa"]);
  });

  it("uses the folder name as the slug, since that is the URL", async () => {
    const source = await brokenCopy(async (dir) => {
      const config = JSON.parse(await readFile(join(dir, "project.json"), "utf8"));
      config.project.slug = "other-name";
      await writeFile(join(dir, "project.json"), JSON.stringify(config));
    });
    expect((await source.list()).map((p) => p.slug)).toEqual(["demo-villa"]);
  });

  it("is empty when the projects folder does not exist", async () => {
    expect(await new FileProjectSource(join(tmpdir(), "no-such-projects-dir")).list()).toEqual([]);
  });
});
