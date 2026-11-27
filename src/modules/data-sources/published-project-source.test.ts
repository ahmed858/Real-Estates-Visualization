import { describe, expect, it, vi } from "vitest";
import type { ProjectConfig } from "@/modules/schema";
import { isPreviewEnabled, ProjectSourceError, PublishedProjectSource, type LoadedProject, type ProjectSource } from "./index";

const loaded = (published?: boolean): LoadedProject => ({
  config: { project: { slug: "p", ...(published !== undefined && { published }) } } as unknown as ProjectConfig,
  units: [],
});
const source = (project: LoadedProject): ProjectSource => ({ load: vi.fn(async () => project), list: async () => [] });

async function errorOf(load: Promise<unknown>) {
  const error = await load.then(() => undefined, (e: unknown) => e);
  expect(error).toBeInstanceOf(ProjectSourceError);
  return error as ProjectSourceError;
}

describe("PublishedProjectSource", () => {
  it("passes through a project without the flag and one with published: true", async () => {
    for (const project of [loaded(), loaded(true)]) {
      expect(await new PublishedProjectSource(source(project), { preview: false }).load("p")).toBe(project);
    }
  });

  it("answers not-found for a hidden project", async () => {
    expect((await errorOf(new PublishedProjectSource(source(loaded(false)), { preview: false }).load("p"))).kind).toBe("not-found");
  });

  it("serves a hidden project when preview is on", async () => {
    const hidden = loaded(false);
    expect(await new PublishedProjectSource(source(hidden), { preview: true }).load("p")).toBe(hidden);
  });

  it("passes errors of the wrapped source through", async () => {
    const failing: ProjectSource = { load: async () => Promise.reject(new ProjectSourceError("p", "invalid-config", ["x"])), list: async () => [] };
    expect((await errorOf(new PublishedProjectSource(failing, { preview: false }).load("p"))).kind).toBe("invalid-config");
  });
});

describe("PublishedProjectSource.list", () => {
  const all: ProjectSource = {
    load: async () => loaded(),
    list: async () => [loaded().config.project, loaded(true).config.project, { ...loaded(false).config.project, slug: "hidden" }],
  };

  it("leaves out hidden projects", async () => {
    expect((await new PublishedProjectSource(all, { preview: false }).list()).map((p) => p.slug)).toEqual(["p", "p"]);
  });

  it("keeps hidden projects when preview is on", async () => {
    expect((await new PublishedProjectSource(all, { preview: true }).list()).map((p) => p.slug)).toEqual(["p", "p", "hidden"]);
  });
});

describe("isPreviewEnabled", () => {
  it("is on only for PREVIEW_PROJECTS=true", () => {
    expect(isPreviewEnabled({ PREVIEW_PROJECTS: "true" })).toBe(true);
  });

  it.each([undefined, "", "false", "1", "TRUE"])("is off for %j", (value) => {
    expect(isPreviewEnabled({ PREVIEW_PROJECTS: value })).toBe(false);
  });
});
