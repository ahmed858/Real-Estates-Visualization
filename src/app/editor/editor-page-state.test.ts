import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { FileProjectSource, ProjectSourceError, type ProjectSource } from "@/modules/data-sources";
import { editorPageState } from "./editor-page-state";

const projects = new FileProjectSource(join(fileURLToPath(new URL("../../..", import.meta.url)), "projects"));
const ON = { EDITOR_ENABLED: "true" };

describe("editorPageState", () => {
  it("loads the project when the editor is enabled", async () => {
    const state = await editorPageState("demo-villa", ON, projects);
    expect(state.kind).toBe("ready");
    expect(state.kind === "ready" && state.project.config.project.slug).toBe("demo-villa");
  });

  it("is not found while the editor is disabled, without loading anything", async () => {
    const load = vi.fn<ProjectSource["load"]>();
    expect(await editorPageState("demo-villa", {}, { load, list: async () => [] })).toEqual({ kind: "not-found" });
    expect(await editorPageState("demo-villa", { EDITOR_ENABLED: "false" }, { load, list: async () => [] })).toEqual({ kind: "not-found" });
    expect(load).not.toHaveBeenCalled();
  });

  it("is not found for an unknown project", async () => {
    expect(await editorPageState("no-such-project", ON, projects)).toEqual({ kind: "not-found" });
  });

  it("lists the problems of an invalid project", async () => {
    const load = async () => {
      throw new ProjectSourceError("x", "invalid-units", ["row 4, price: must be a number"]);
    };
    expect(await editorPageState("x", ON, { load, list: async () => [] })).toEqual({ kind: "invalid", issues: ["row 4, price: must be a number"] });
  });
});
