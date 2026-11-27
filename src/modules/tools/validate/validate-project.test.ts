import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProjectConfig, UnitRow } from "@/modules/schema";
import { UnitSourceError, UnitSourceReadError, type UnitSource } from "@/modules/data-sources";
import { errorsOf, formatReport, runValidateCli, validateProject, warningsOf } from "../index";

const VALID = fileURLToPath(new URL("../__fixtures__/valid-project", import.meta.url));
const FIXTURES = fileURLToPath(new URL("../__fixtures__", import.meta.url));

const temps: string[] = [];
afterEach(async () => {
  await Promise.all(temps.splice(0).map((d) => rm(d, { recursive: true, force: true })));
  vi.restoreAllMocks();
});

/** Copies the valid project to a temp folder so a test can break one thing. */
async function copyValid(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "validate-"));
  temps.push(root);
  const dir = join(root, "valid-project");
  await cp(VALID, dir, { recursive: true });
  return dir;
}

async function editConfig(dir: string, edit: (config: ProjectConfig) => void) {
  const path = join(dir, "project.json");
  const config = JSON.parse(await readFile(path, "utf8"));
  edit(config);
  await writeFile(path, JSON.stringify(config));
}

const unit = (code: string, scene: string, sheetRow: number, extra: Partial<UnitRow> = {}): UnitRow => ({
  code,
  scene,
  floor: 0,
  type: "Apartment",
  bedrooms: 2,
  bathrooms: 1,
  areaM2: 100,
  price: 1000000,
  status: "available",
  sheetRow,
  ...extra,
});
const rows = (units: UnitRow[]) => ({ unitSource: (): UnitSource => ({ load: async () => units }) });
const VALID_ROWS = [unit("G-01", "ground", 2), unit("G-02", "ground", 3), unit("F-01", "first", 4)];

const summary = (report: Awaited<ReturnType<typeof validateProject>>) =>
  report.findings.map((f) => `${f.severity} ${f.file}${f.location ? ` (${f.location})` : ""}: ${f.message}`);

describe("validateProject", () => {
  it("passes the valid fixture project, reading its units.xlsx", async () => {
    const report = await validateProject(VALID);
    expect(report.slug).toBe("valid-project");
    expect(report.findings).toEqual([]);
    expect(formatReport(report)).toContain("OK: no problems found.");
  });

  it("reports a missing or broken project.json", async () => {
    const dir = await copyValid();
    await writeFile(join(dir, "project.json"), "{ not json");
    const report = await validateProject(dir, rows(VALID_ROWS));
    expect(summary(report)).toEqual([expect.stringMatching(/^error project\.json: not valid JSON/)]);

    await rm(join(dir, "project.json"));
    expect(summary(await validateProject(dir, rows(VALID_ROWS)))).toEqual(["error project.json: file not found"]);
  });

  it("reports config schema errors with their path", async () => {
    const dir = await copyValid();
    await editConfig(dir, (c) => {
      c.project.currency = "egp";
    });
    const report = await validateProject(dir, rows(VALID_ROWS));
    expect(summary(report)).toEqual([expect.stringMatching(/^error project\.json \(project\.currency\): must be a 3-letter/)]);
  });

  it("reports a polygon outside its image and a polygon with fewer than 3 points", async () => {
    const dir = await copyValid();
    await editConfig(dir, (c) => {
      c.root.children[0].hotspots[0].points[1] = [500, 0];
      c.root.children[1].hotspots[0].points = [[0, 0], [1, 1]];
    });
    const report = await validateProject(dir, rows(VALID_ROWS));
    expect(summary(report)).toEqual([
      "error project.json (root.children[1].hotspots[0].points): a polygon needs at least 3 points",
    ]);
    await editConfig(dir, (c) => {
      c.root.children[1].hotspots[0].points = [[0, 0], [1, 0], [1, 1]];
    });
    expect(summary(await validateProject(dir, rows(VALID_ROWS)))).toEqual([
      "error project.json (root.children[0].hotspots[0].points[1]): point [500, 0] is outside the image (100x100)",
    ]);
  });

  it("reports units sheet errors with row and column", async () => {
    const dir = await copyValid();
    const source = (): UnitSource => ({
      load: async () => {
        throw new UnitSourceError("units.xlsx", [{ row: 3, column: "price", message: "must be a number" }]);
      },
    });
    expect(summary(await validateProject(dir, { unitSource: source }))).toEqual([
      "error units.xlsx (row 3, price): must be a number",
    ]);
  });

  it("reports a missing units.xlsx", async () => {
    const dir = await copyValid();
    await rm(join(dir, "units.xlsx"));
    expect(summary(await validateProject(dir))).toEqual(["error units.xlsx: file not found"]);
  });

  it("reports a hotspot unit that is not in the sheet", async () => {
    const dir = await copyValid();
    const report = await validateProject(dir, rows(VALID_ROWS.slice(0, 2)));
    expect(summary(report)).toEqual([
      'error project.json (scene "first", hotspot "f-01"): unit "F-01" is not in units.xlsx',
    ]);
  });

  it("reports a sheet unit that is not drawn on any scene", async () => {
    const dir = await copyValid();
    const report = await validateProject(dir, rows([...VALID_ROWS, unit("R-01", "first", 5)]));
    expect(summary(report)).toEqual(['error units.xlsx (row 5, code): unit "R-01" is not drawn on any scene']);
  });

  it("reports referenced images that do not exist", async () => {
    const dir = await copyValid();
    await rm(join(dir, "images", "first.svg"));
    await rm(join(dir, "images", "logo.svg"));
    const report = await validateProject(dir, rows([unit("G-01", "ground", 2), unit("G-02", "ground", 3, { planImage: "images/missing.svg" }), unit("F-01", "first", 4, { gallery: ["images/ground.svg", "images/no-photo.jpg"] })]));
    expect(summary(report)).toEqual([
      'error project.json (project.branding.logo): file "images/logo.svg" does not exist',
      'error project.json (scene "first", image.path): file "images/first.svg" does not exist',
      'error units.xlsx (row 3, plan_image): file "images/missing.svg" does not exist',
      'error units.xlsx (row 4, gallery): file "images/no-photo.jpg" does not exist',
    ]);
  });

  it("reports missing rotation frames and 3D models", async () => {
    const dir = await copyValid();
    await editConfig(dir, (config) => {
      Object.assign(config.root, { type: "rotation-360", rotation: { frames: "rotations/root/f{index}.svg", count: 3, width: 100, height: 100 } });
      Object.assign(config.root.children[0], { type: "model-3d", model: { path: "models/ground.glb" } });
    });
    await mkdir(join(dir, "rotations", "root"), { recursive: true });
    await writeFile(join(dir, "rotations", "root", "f2.svg"), "<svg/>");
    const report = await validateProject(dir, rows(VALID_ROWS));
    const { root } = JSON.parse(await readFile(join(dir, "project.json"), "utf8")) as ProjectConfig;
    expect(summary(report)).toEqual([
      `error project.json (scene "${root.id}", rotation frame 1): file "rotations/root/f1.svg" does not exist`,
      `error project.json (scene "${root.id}", rotation frame 3): file "rotations/root/f3.svg" does not exist`,
      `error project.json (scene "${root.children[0].id}", model.path): file "models/ground.glb" does not exist`,
    ]);
  });

  it("reports rotation frames and 3D models over their size limit", async () => {
    const dir = await copyValid();
    await editConfig(dir, (config) => {
      Object.assign(config.root, { type: "rotation-360", rotation: { frames: "rotations/root/f{index}.jpg", count: 2, width: 100, height: 100 } });
      Object.assign(config.root.children[0], { type: "model-3d", model: { path: "models/ground.glb" } });
    });
    await mkdir(join(dir, "rotations", "root"), { recursive: true });
    await mkdir(join(dir, "models"));
    await writeFile(join(dir, "rotations", "root", "f1.jpg"), Buffer.alloc(10));
    await writeFile(join(dir, "rotations", "root", "f2.jpg"), Buffer.alloc(Math.round(2.5 * 1024 * 1024)));
    await writeFile(join(dir, "models", "ground.glb"), Buffer.alloc(31 * 1024 * 1024));
    const report = await validateProject(dir, rows(VALID_ROWS));
    const { root } = JSON.parse(await readFile(join(dir, "project.json"), "utf8")) as ProjectConfig;
    expect(summary(report)).toEqual([
      `error project.json (scene "${root.id}", rotation frame 2): file "rotations/root/f2.jpg" is 2.5 MB; rotation frames may be at most 2 MB`,
      `error project.json (scene "${root.children[0].id}", model.path): file "models/ground.glb" is 31 MB; 3D models may be at most 30 MB`,
    ]);
  });

  it("reports a missing or oversized panorama, and does not ask for a hotspot to a premium scene", async () => {
    const dir = await copyValid();
    await editConfig(dir, (config) => {
      Object.assign(config.root.children[0], { type: "panorama-360", panorama: { path: "panoramas/ground.jpg", width: 200, height: 100 } });
      config.root.hotspots = config.root.hotspots.filter((h) => !("scene" in h.target) || h.target.scene !== config.root.children[0].id);
    });
    const { root } = JSON.parse(await readFile(join(dir, "project.json"), "utf8")) as ProjectConfig;
    expect(summary(await validateProject(dir, rows(VALID_ROWS)))).toEqual([`error project.json (scene "${root.children[0].id}", panorama.path): file "panoramas/ground.jpg" does not exist`]);
    await mkdir(join(dir, "panoramas"));
    await writeFile(join(dir, "panoramas", "ground.jpg"), Buffer.alloc(9 * 1024 * 1024));
    expect(summary(await validateProject(dir, rows(VALID_ROWS)))).toEqual([
      `error project.json (scene "${root.children[0].id}", panorama.path): file "panoramas/ground.jpg" is 9 MB; 360° panoramas may be at most 8 MB`,
    ]);
  });

  it("warns, without failing, about unreachable scenes and mismatched sheet scenes", async () => {
    const dir = await copyValid();
    await editConfig(dir, (c) => {
      c.root.hotspots.pop();
    });
    const report = await validateProject(dir, rows([unit("G-01", "ground", 2), unit("G-02", "first", 3), unit("F-01", "attic", 4)]));
    expect(errorsOf(report)).toEqual([]);
    expect(summary(report)).toEqual([
      'warning project.json (scene "first"): no hotspot on "facade" opens this scene, so visitors cannot reach it',
      'warning units.xlsx (row 3, scene): unit "G-02" is listed on scene "first" but drawn on "ground"',
      'warning units.xlsx (row 4, scene): scene "attic" does not exist',
    ]);
    expect(warningsOf(report)).toHaveLength(3);
    expect(formatReport(report)).toContain("OK with warnings.");
  });
});

describe("runValidateCli", () => {
  it("exits 0 for a valid project and prints the report", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    expect(await runValidateCli(["valid-project"], FIXTURES)).toBe(0);
    expect(log.mock.calls[0][0]).toContain('Project "valid-project"');
  });

  it("exits 1 when there are errors", async () => {
    const dir = await copyValid();
    await rm(join(dir, "images", "facade.svg"));
    vi.spyOn(console, "log").mockImplementation(() => {});
    expect(await runValidateCli(["valid-project"], join(dir, ".."))).toBe(1);
  });

  it("exits 0 with warnings only", async () => {
    const dir = await copyValid();
    await editConfig(dir, (c) => {
      c.root.children.push({
        id: "roof",
        kind: "floor",
        title: { ar: "السطح", en: "Roof" },
        type: "image-2d",
        image: { path: "images/first.svg", width: 100, height: 100 },
        hotspots: [],
        children: [],
      });
    });
    vi.spyOn(console, "log").mockImplementation(() => {});
    expect(await runValidateCli(["valid-project"], join(dir, ".."))).toBe(0);
  });

  it("exits 2 without a slug", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await runValidateCli([], FIXTURES)).toBe(2);
  });
});

describe("validateProject: units source from project.json", () => {
  const SHEET = { source: "google-sheet", sheetId: "x".repeat(44), gid: "5" };

  async function sheetProject(units: unknown = SHEET) {
    const dir = await copyValid();
    await editConfig(dir, (c) => Object.assign(c, { units }));
    await rm(join(dir, "units.xlsx"));
    return dir;
  }

  it("reads the Google Sheet the config names and names it in findings", async () => {
    const dir = await sheetProject();
    const seen: unknown[] = [];
    const unitSource = (units: unknown): UnitSource => {
      seen.push(units);
      return { load: async () => VALID_ROWS.slice(0, 2) };
    };
    expect(summary(await validateProject(dir, { unitSource }))).toEqual([
      'error project.json (scene "first", hotspot "f-01"): unit "F-01" is not in Google Sheet',
    ]);
    expect(seen).toEqual([{ ...SHEET, refreshSeconds: 60 }]);
  });

  it("reports Google Sheet row errors against the sheet", async () => {
    const dir = await sheetProject();
    const unitSource = (): UnitSource => ({
      load: async () => {
        throw new UnitSourceError("sheet", [{ row: 4, column: "status", message: "is required" }]);
      },
    });
    expect(summary(await validateProject(dir, { unitSource }))).toEqual(["error Google Sheet (row 4, status): is required"]);
  });

  it("reports a sheet that cannot be read as one finding", async () => {
    const dir = await sheetProject();
    const unitSource = (): UnitSource => ({
      load: async () => {
        throw new UnitSourceReadError("Google Sheet x", "not-shared", "the sheet is not shared");
      },
    });
    expect(summary(await validateProject(dir, { unitSource }))).toEqual(["error Google Sheet: Google Sheet x: the sheet is not shared"]);
  });

  it("does not read any units when the units block itself is invalid", async () => {
    const dir = await sheetProject({ source: "google-sheet" });
    const unitSource = vi.fn((): UnitSource => ({ load: async () => VALID_ROWS }));
    expect(summary(await validateProject(dir, { unitSource }))).toEqual([expect.stringMatching(/^error project\.json \(units\.sheetId\): /)]);
    expect(unitSource).not.toHaveBeenCalled();
  });

  it("keeps reading units.xlsx for an explicit xlsx source", async () => {
    const dir = await copyValid();
    await editConfig(dir, (c) => Object.assign(c, { units: { source: "xlsx" } }));
    expect((await validateProject(dir)).findings).toEqual([]);
  });
});
