import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FileProjectSource } from "@/modules/data-sources";
import { parseProjectConfig } from "@/modules/schema";
import { createProject, NewProjectError, runNewProjectCli, scaffoldProjectConfig } from "../index";

const repo = (path: string) => fileURLToPath(new URL(`../../../../${path}`, import.meta.url));
const TEMPLATE = repo("docs/collection-guide/units-template.xlsx");
const PHOTO = repo("projects/demo-residence/images/facade.jpg");

const temps: string[] = [];
afterEach(async () => {
  await Promise.all(temps.splice(0).map((d) => rm(d, { recursive: true, force: true })));
  vi.restoreAllMocks();
});
async function projectsDir() {
  const dir = await mkdtemp(join(tmpdir(), "new-project-"));
  temps.push(dir);
  return dir;
}

describe("scaffoldProjectConfig", () => {
  it("is a valid config with the root image size and placeholders", () => {
    const text = scaffoldProjectConfig("palm-towers", "images/facade.jpg", { width: 1600, height: 1707 });
    expect(text.endsWith("}\n")).toBe(true);
    const parsed = parseProjectConfig(JSON.parse(text));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.project.slug).toBe("palm-towers");
    expect(parsed.value.project.name.en).toBe("Palm Towers");
    expect(parsed.value.root.image).toEqual({ path: "images/facade.jpg", width: 1600, height: 1707 });
  });
});

describe("createProject", () => {
  it("writes the folder, copies the image and units template, and the project loads", async () => {
    const dir = await projectsDir();
    await createProject({ projectsDir: dir, slug: "palm-towers", rootImage: PHOTO, unitsTemplate: TEMPLATE });
    const config = JSON.parse(await readFile(join(dir, "palm-towers", "project.json"), "utf8"));
    expect(config.root.image).toEqual({ path: "images/facade.jpg", width: 1600, height: 1707 });
    expect((await readFile(join(dir, "palm-towers", "images", "facade.jpg"))).equals(await readFile(PHOTO))).toBe(true);
    // The editor and viewer can open it right away.
    const loaded = await new FileProjectSource(dir).load("palm-towers");
    expect(loaded.units.length).toBeGreaterThan(0);
  });

  it("refuses an existing folder, a bad slug, a non-image and an unreadable image", async () => {
    const dir = await projectsDir();
    await mkdir(join(dir, "taken"));
    const make = (slug: string, rootImage = PHOTO) => createProject({ projectsDir: dir, slug, rootImage, unitsTemplate: TEMPLATE });
    await expect(make("taken")).rejects.toThrow("already exists");
    await expect(make("Bad Slug")).rejects.toThrow("not a valid slug");
    await expect(make("ok", TEMPLATE)).rejects.toThrow("not a PNG, JPEG, SVG or WebP");
    await expect(make("ok", join(dir, "missing.png"))).rejects.toThrow(NewProjectError);
    await writeFile(join(dir, "broken.png"), "nope");
    await expect(make("ok", join(dir, "broken.png"))).rejects.toThrow("cannot read the size");
  });
});

describe("runNewProjectCli", () => {
  it("prints usage, errors and next steps with exit codes", async () => {
    const dir = await projectsDir();
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await runNewProjectCli([], dir, TEMPLATE)).toBe(2);
    expect(await runNewProjectCli(["Bad Slug", PHOTO], dir, TEMPLATE)).toBe(1);
    expect(error).toHaveBeenCalledWith(expect.stringContaining("not a valid slug"));
    expect(await runNewProjectCli(["palm", PHOTO], dir, TEMPLATE)).toBe(0);
    expect(log.mock.calls[0][0]).toContain("/editor/palm");
  });
});
