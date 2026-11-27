import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { FileProjectSource } from "@/modules/data-sources";
import { editorPageState } from "../editor/editor-page-state";
import { projectPageState, visitorProjectSource } from "./project-page-state";

const PROJECTS = fileURLToPath(new URL("../../../projects", import.meta.url));
const temps: string[] = [];
afterEach(async () => {
  await Promise.all(temps.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

/** A projects folder with demo-villa, its project.json given `published`. */
async function projectsWith(published: boolean | undefined): Promise<FileProjectSource> {
  const root = await mkdtemp(join(tmpdir(), "published-"));
  temps.push(root);
  await cp(join(PROJECTS, "demo-villa"), join(root, "demo-villa"), { recursive: true });
  const path = join(root, "demo-villa", "project.json");
  const config = JSON.parse(await readFile(path, "utf8"));
  if (published === undefined) delete config.project.published;
  else config.project.published = published;
  await writeFile(path, JSON.stringify(config));
  return new FileProjectSource(root);
}

describe("projectPageState", () => {
  it("shows a published project, with or without the flag", async () => {
    for (const published of [undefined, true]) {
      const state = await projectPageState("demo-villa", visitorProjectSource(await projectsWith(published), {}));
      expect(state.kind).toBe("ready");
    }
  });

  it("answers 404 for a hidden project", async () => {
    const state = await projectPageState("demo-villa", visitorProjectSource(await projectsWith(false), {}));
    expect(state).toEqual({ kind: "not-found" });
  });

  it("shows a hidden project when PREVIEW_PROJECTS=true", async () => {
    const state = await projectPageState("demo-villa", visitorProjectSource(await projectsWith(false), { PREVIEW_PROJECTS: "true" }));
    expect(state.kind).toBe("ready");
  });

  it("answers 404 for an unknown project and lists problems for an invalid one", async () => {
    const all = await projectsWith(undefined);
    expect(await projectPageState("nope", visitorProjectSource(all, {}))).toEqual({ kind: "not-found" });
    const broken = await projectsWith(undefined);
    await writeFile(join(temps[temps.length - 1], "demo-villa", "project.json"), "{");
    const state = await projectPageState("demo-villa", visitorProjectSource(broken, {}));
    expect(state.kind).toBe("invalid");
  });

  it("the editor ignores the flag: it opens a hidden project", async () => {
    const state = await editorPageState("demo-villa", { EDITOR_ENABLED: "true" }, await projectsWith(false));
    expect(state.kind).toBe("ready");
  });
});
