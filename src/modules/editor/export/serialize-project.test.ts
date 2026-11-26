import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseProjectConfig, type ProjectConfig } from "@/modules/schema";
import { serializeProjectConfig } from "../index";

const file = (path: string) => fileURLToPath(new URL(`../../../../${path}`, import.meta.url));

async function load(path: string): Promise<{ text: string; config: ProjectConfig }> {
  const text = await readFile(file(path), "utf8");
  const parsed = parseProjectConfig(JSON.parse(text));
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.errors));
  return { text, config: parsed.value };
}

describe("serializeProjectConfig", () => {
  it.each(["projects/demo-villa/project.json", "projects/demo-residence/project.json"])("exports %s without edits byte for byte", async (path) => {
    const { text, config } = await load(path);
    expect(serializeProjectConfig(config)).toBe(text);
  });

  it("exports a hand-formatted project with the same data", async () => {
    // The test fixture is formatted by hand, so only its data must survive.
    const { text, config } = await load("src/modules/tools/__fixtures__/valid-project/project.json");
    expect(JSON.parse(serializeProjectConfig(config))).toEqual(JSON.parse(text));
  });

  it("leaves out schema defaults but keeps typical floors, the units block and empty hotspot lists", async () => {
    const { config } = await load("projects/demo-villa/project.json");
    const edited: ProjectConfig = {
      ...config,
      units: { source: "google-sheet", sheetId: "a".repeat(25), gid: "0", refreshSeconds: 60 },
      root: {
        ...config.root,
        children: [
          ...config.root.children,
          { id: "typical", kind: "floor", type: "image-2d", title: { ar: "متكرر", en: "Typical" }, image: { path: "images/t.png", width: 10, height: 10 }, floors: { from: 2, to: 4, unitCode: "{floor}{suffix}" }, hotspots: [], children: [] },
        ],
      },
    };
    const out = serializeProjectConfig(edited);
    const json = JSON.parse(out);
    expect(Object.keys(json)).toEqual(["schemaVersion", "project", "units", "root"]);
    const typical = json.root.children.at(-1);
    expect(Object.keys(typical)).toEqual(["id", "kind", "title", "image", "floors", "hotspots"]);
    expect(out).not.toContain('"type"');
    // What it writes reads back as the same config.
    const back = parseProjectConfig(json);
    expect(back.ok && back.value).toEqual(edited);
  });
});
