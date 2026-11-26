import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readProjectImage } from "./index";

const projectsDir = fileURLToPath(new URL("../../../projects", import.meta.url));

describe("readProjectImage", () => {
  it("serves an SVG image with its content type", async () => {
    const file = await readProjectImage(projectsDir, "demo-villa", ["images", "facade.svg"]);
    expect(file?.contentType).toBe("image/svg+xml");
    expect(file?.body.toString("utf8")).toMatch(/^<svg /);
  });

  it.each([
    [["..", "demo-villa", "project.json"]],
    [["images", "..", "..", "..", "package.json"]],
    [["images", "../../package.json"]],
    [["images", "..\\..\\x.svg"]],
    [["."]],
    [[]],
  ])("rejects unsafe path %j", async (segments) => {
    expect(await readProjectImage(projectsDir, "demo-villa", segments)).toBeNull();
  });

  it.each(["../projects", "Demo-Villa", "missing-project"])("rejects slug %j", async (slug) => {
    expect(await readProjectImage(projectsDir, slug, ["images", "facade.svg"])).toBeNull();
  });

  it.each([["project.json"], ["units.xlsx"], ["README.md"]])("rejects non-image file %j", async (name) => {
    expect(await readProjectImage(projectsDir, "demo-villa", [name])).toBeNull();
  });

  it("returns null for a missing image", async () => {
    expect(await readProjectImage(projectsDir, "demo-villa", ["images", "nope.png"])).toBeNull();
  });
});
