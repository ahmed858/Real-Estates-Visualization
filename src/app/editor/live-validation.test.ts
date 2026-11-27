// The editor's live problem list and `npm run validate` must agree: same data in, same findings out.
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { listProjectImages, type UnitSource } from "@/modules/data-sources";
import type { Finding } from "@/modules/domain";
import { liveFindings } from "@/modules/editor";
import { parseProjectConfig, type ProjectConfig, type UnitRow } from "@/modules/schema";
import { validateProject } from "@/modules/tools";

const VALID = fileURLToPath(new URL("../../modules/tools/__fixtures__/valid-project", import.meta.url));
const temps: string[] = [];
afterEach(async () => {
  await Promise.all(temps.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

const unit = (code: string, scene: string, sheetRow: number): UnitRow => ({
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
});

/** Writes the edited config to a copy of the valid project, then runs both checkers on the same data. */
async function bothCheckers(edit: (config: ProjectConfig) => void, units: UnitRow[]) {
  const root = await mkdtemp(join(tmpdir(), "live-"));
  temps.push(root);
  const dir = join(root, "valid-project");
  await cp(VALID, dir, { recursive: true });
  const config = JSON.parse(await readFile(join(dir, "project.json"), "utf8"));
  edit(config);
  await writeFile(join(dir, "project.json"), JSON.stringify(config));

  const cli = await validateProject(dir, { unitSource: (): UnitSource => ({ load: async () => units }) });
  const images = await listProjectImages(root, "valid-project");
  const parsed = parseProjectConfig(config);
  // The editor always holds a parsed config; when the edit breaks the shape, compare only the schema errors.
  const live = liveFindings({ config: parsed.ok ? parsed.value : config, units, existingFiles: new Set(images.map((i) => i.path)) });
  const key = (f: Finding) => `${f.severity} ${f.file} ${f.location ?? ""} ${f.message}`;
  return { cli: cli.findings.map(key).sort(), live: live.map(key).sort(), liveFindings: live };
}

const ROWS = [unit("G-01", "ground", 2), unit("G-02", "ground", 3), unit("F-01", "first", 4)];

describe("live validation matches npm run validate", () => {
  it("finds nothing on the valid project", async () => {
    const { cli, live } = await bothCheckers(() => {}, ROWS);
    expect(live).toEqual(cli);
    expect(live).toEqual([]);
  });

  it("reports the same cross-check problems: unknown unit, unplaced unit, unreachable scene, missing image", async () => {
    const { cli, live, liveFindings } = await bothCheckers(
      (c) => {
        c.root.hotspots = c.root.hotspots!.filter((h) => h.id !== "to-first");
        c.root.children![0].hotspots![0].target = { unit: "G-99" };
        c.root.children![0].image.path = "images/missing.svg";
      },
      [...ROWS, unit("X-01", "ground", 5)],
    );
    expect(live).toEqual(cli);
    expect(live.length).toBeGreaterThanOrEqual(4);
    // Each problem is tied to its scene, and to the hotspot when it has one.
    expect(liveFindings.find((f) => f.message.includes("G-99"))).toMatchObject({ sceneId: "ground", hotspotId: "g-01" });
    expect(liveFindings.find((f) => f.message.includes("missing.svg"))).toMatchObject({ sceneId: "ground" });
    expect(liveFindings.find((f) => f.message.includes("cannot reach"))).toMatchObject({ sceneId: "facade" });
  });

  it("reports the same schema errors, located on the scene and hotspot", async () => {
    const { cli, live, liveFindings } = await bothCheckers((c) => {
      c.root.children![1].hotspots![0].target = { unit: "" };
    }, ROWS);
    expect(live).toEqual(cli);
    expect(liveFindings).toEqual([expect.objectContaining({ severity: "error", sceneId: "first", hotspotId: "f-01" })]);
  });

  it("reports the same brand colour warnings", async () => {
    const { cli, live } = await bothCheckers((c) => {
      c.project.branding.primaryColor = "#2f8f42";
      c.project.branding.accentColor = "#333366";
    }, ROWS);
    expect(live).toEqual(cli);
    expect(live).toEqual([
      expect.stringContaining("project.branding.accentColor #333366 has contrast"),
      expect.stringContaining('project.branding.primaryColor #2f8f42 looks like the "available" status colour'),
    ]);
  });
});
