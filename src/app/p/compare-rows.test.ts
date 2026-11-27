import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { FileProjectSource } from "@/modules/data-sources";
import { createSceneTree } from "@/modules/domain";
import { compareRows } from "./compare-rows";

const projects = new FileProjectSource(join(fileURLToPath(new URL("../../..", import.meta.url)), "projects"));

async function rowsFor(param: string | undefined, locale: "ar" | "en" = "en") {
  const { config, units } = await projects.load("demo-villa");
  const tree = createSceneTree(config);
  return compareRows({
    tree,
    units,
    param,
    locale,
    projectName: config.project.name[locale],
    whatsapp: "+201001234567",
    hrefOf: (sceneId, code) => `/p/demo-villa/${sceneId}?unit=${code}`,
    fileUrl: (path) => `/files/demo-villa/${path}`,
  });
}

describe("compareRows", () => {
  it("returns the named units in order with scene title, link and enquiry", async () => {
    const rows = await rowsFor("F-01,G-01");
    expect(rows.map((r) => [r.code, r.sceneTitle, r.href])).toEqual([
      ["F-01", "First floor", "/p/demo-villa/first?unit=F-01"],
      ["G-01", "Ground floor", "/p/demo-villa/ground?unit=G-01"],
    ]);
    expect(decodeURIComponent(rows[0].enquiryHref!)).toContain("unit F-01");
  });

  it("skips unknown codes and returns nothing without the parameter", async () => {
    expect((await rowsFor("X-99,G-02")).map((r) => r.code)).toEqual(["G-02"]);
    expect(await rowsFor(undefined)).toEqual([]);
  });
});
