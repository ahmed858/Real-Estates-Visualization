// Checks the client collection guide (docs/collection-guide): the units template
// passes the units sheet schema, and the Arabic and English guides keep the same structure.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { XlsxFileSource } from "@/modules/data-sources";
import { UNIT_COLUMNS } from "@/modules/schema";

const guideFile = (name: string) => fileURLToPath(new URL(`../docs/collection-guide/${name}`, import.meta.url));

/** Line kinds that must match one to one between the two languages. */
function structure(markdown: string) {
  const lines = markdown.split("\n");
  const count = (re: RegExp) => lines.filter((l) => re.test(l)).length;
  return {
    headings: lines.filter((l) => /^#{1,6} /.test(l)).map((l) => l.match(/^#+/)![0]),
    tableRows: count(/^\|/),
    checklistItems: count(/^- \[ \] /),
    listItems: count(/^- (?!\[ \])/),
    codeSpans: lines.flatMap((l) => l.match(/`[^`]+`/g) ?? []),
    // Each guide links to the other language, so those two links differ by design.
    links: lines
      .flatMap((l) => [...l.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1]))
      .filter((link) => link !== "ar.md" && link !== "en.md"),
  };
}

describe("units template", () => {
  it("passes the units sheet schema", async () => {
    const units = await new XlsxFileSource(guideFile("units-template.xlsx")).load();
    expect(units.map((u) => [u.code, u.status])).toEqual([
      ["G-01", "available"],
      ["F-01", "reserved"],
    ]);
  });

  it("has every fixed column, and the guides list each one", () => {
    for (const name of ["en.md", "ar.md"]) {
      const guide = readFileSync(guideFile(name), "utf8");
      for (const column of UNIT_COLUMNS) expect(guide, `${name} lists ${column}`).toContain(`| \`${column}\` |`);
    }
  });
});

describe("collection guide", () => {
  it("has the same structure in Arabic and English", () => {
    const en = structure(readFileSync(guideFile("en.md"), "utf8"));
    const ar = structure(readFileSync(guideFile("ar.md"), "utf8"));
    expect(ar).toEqual(en);
  });
});
