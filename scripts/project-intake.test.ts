// Checks the project intake skill (.claude/skills/project-intake): its JSON Schema
// is the one generated from the code, and every worked example is a valid project
// whose units sheet fits its scene tree. Images are not part of the examples.
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseCsv, sheetTableFromRows } from "@/modules/data-sources";
import { checkProjectFit, createSceneTree } from "@/modules/domain";
import { parseProjectConfig, parseUnitsSheet, SCENE_KINDS } from "@/modules/schema";
import { projectJsonSchemaText, unitsXlsxFromCsv } from "@/modules/tools";

const skillFile = (name: string) => fileURLToPath(new URL(`../.claude/skills/project-intake/${name}`, import.meta.url));
const read = (name: string) => readFileSync(skillFile(name), "utf8");
const examples = readdirSync(skillFile("examples"));

describe("project intake skill", () => {
  it("has the frontmatter agents use to find it", () => {
    const front = read("SKILL.md").match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? "";
    expect(front).toMatch(/^name: project-intake$/m);
    expect(front).toMatch(/^description: .{40,}$/m);
  });

  it("names every scene kind", () => {
    const skill = read("SKILL.md");
    for (const kind of SCENE_KINDS) expect(skill).toContain(`\`${kind}\``);
  });

  it("ships the JSON Schema generated from the code (run npm run generate:schema)", () => {
    expect(read("project.schema.json")).toBe(projectJsonSchemaText());
  });

  it("has a tower and a villa compound example", () => {
    expect(examples).toEqual(expect.arrayContaining(["tower", "villa-compound"]));
  });

  describe.each(examples)("example %s", (name) => {
    it("is a valid project whose units fit its scenes", () => {
      const config = parseProjectConfig(JSON.parse(read(`examples/${name}/project.json`)));
      expect(config.ok ? [] : config.errors).toEqual([]);
      const units = parseUnitsSheet(sheetTableFromRows(parseCsv(read(`examples/${name}/units.csv`))));
      expect(units.ok ? [] : units.errors).toEqual([]);
      if (!config.ok || !units.ok) return;
      const findings = checkProjectFit(createSceneTree(config.value), units.value, "units.csv", config.value.project.branding);
      expect(findings).toEqual([]);
    });

    it("converts its units.csv to units.xlsx", () => {
      expect(unitsXlsxFromCsv(read(`examples/${name}/units.csv`)).ok).toBe(true);
    });
  });
});
