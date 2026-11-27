import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { FileProjectSource } from "@/modules/data-sources";
import { loadProjectMetadata, projectMetadata } from "./project-metadata";

const projects = new FileProjectSource(join(fileURLToPath(new URL("../../..", import.meta.url)), "projects"));
const request = (slug: string, sceneId?: string, lang?: string) => ({
  params: Promise.resolve({ slug, ...(sceneId && { sceneId }) }),
  searchParams: Promise.resolve(lang ? { lang } : {}),
});

describe("project metadata", () => {
  it("uses the project name, logo and root image in the default locale", async () => {
    const meta = await loadProjectMetadata(projects, request("demo-residence"), "scene");
    expect(meta.title).toBe("جاردن ريزيدنس");
    expect(meta.description).toContain("جاردن ريزيدنس");
    expect(meta.icons).toEqual({ icon: "/files/demo-residence/images/logo.svg" });
    expect(meta.openGraph).toMatchObject({
      title: "جاردن ريزيدنس",
      images: [{ url: "/files/demo-residence/images/facade.jpg", width: 1600, height: 1707 }],
    });
  });

  it("names the scene and the units table, in the requested locale", async () => {
    const { config } = await projects.load("demo-residence");
    const scene = config.root.children[0];
    expect(projectMetadata(config, { kind: "scene", sceneId: scene.id }, "en")?.title).toBe(`${scene.title.en} · Garden Residence`);
    expect(projectMetadata(config, { kind: "scene", sceneId: config.root.id }, "en")?.title).toBe("Garden Residence");
    expect(projectMetadata(config, { kind: "units" }, "en")?.title).toBe("All units · Garden Residence");
    expect(projectMetadata(config, { kind: "compare" }, "en")?.title).toBe("Compare units · Garden Residence");
    expect(projectMetadata(config, { kind: "compare" }, "ar")?.title).toBe("مقارنة الوحدات · جاردن ريزيدنس");
    const en = await loadProjectMetadata(projects, request("demo-residence", undefined, "en"), "units");
    expect(en.description).toBe("Interactive floor plans of Garden Residence: browse the floors and see which units are available.");
  });

  it("keeps the site defaults for an unknown project or scene", async () => {
    expect(await loadProjectMetadata(projects, request("no-such-project"), "scene")).toEqual({});
    expect(await loadProjectMetadata(projects, request("demo-residence", "no-such-scene"), "scene")).toEqual({});
  });
});
