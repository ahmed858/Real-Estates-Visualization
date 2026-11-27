// `npm run units:from-csv -- <slug> <file.csv>`: turns a units sheet written as
// CSV (what an agent or a quick export produces) into the project's units.xlsx.
// The rows are validated with the units sheet schema first, so a bad sheet is never written.
import { readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseCsv, sheetTableFromRows } from "@/modules/data-sources";
import { formatSheetIssue, parseUnitsSheet, type UnitColumn } from "@/modules/schema";
import { buildXlsx, type XlsxCell } from "../xlsx/write-xlsx";

/** Columns written as numbers so the client's spreadsheet app treats them as numbers. `code` stays text. */
const NUMBER_COLUMNS: readonly UnitColumn[] = ["floor", "bedrooms", "bathrooms", "area_m2", "price"];
const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/;

function typedRows(rows: readonly (readonly string[])[]): XlsxCell[][] {
  const [header = [], ...data] = rows;
  const numeric = header.map((h) => (NUMBER_COLUMNS as readonly string[]).includes(h.trim().toLowerCase()));
  return [[...header], ...data.map((row) => row.map((cell, i) => (numeric[i] && PLAIN_NUMBER.test(cell.trim()) ? Number(cell.trim()) : cell)))];
}

export type UnitsCsvResult = { ok: true; xlsx: Buffer; rows: number; warnings: string[] } | { ok: false; errors: string[] };

/** Validates CSV text as a units sheet and, when it is valid, builds the .xlsx with the same cells. */
export function unitsXlsxFromCsv(csv: string): UnitsCsvResult {
  const rows = parseCsv(csv);
  const parsed = parseUnitsSheet(sheetTableFromRows(rows));
  const warnings = parsed.warnings.map(formatSheetIssue);
  if (!parsed.ok) return { ok: false, errors: [...parsed.errors.map(formatSheetIssue), ...warnings] };
  return { ok: true, xlsx: buildXlsx(typedRows(rows), "Units"), rows: parsed.value.length, warnings };
}

/** CLI wrapper; returns the exit code. */
export async function runUnitsFromCsvCli(args: readonly string[], projectsDir: string): Promise<number> {
  const [slug, csvFile] = args;
  if (!slug || !csvFile) {
    console.error("Usage: npm run units:from-csv -- <project-slug> <units.csv>");
    return 2;
  }
  const dir = join(projectsDir, slug);
  const isDir = await stat(dir).then((s) => s.isDirectory(), () => false);
  if (!isDir) {
    console.error(`projects/${slug}/ does not exist. Create it first: npm run new:project -- ${slug} <root-image>`);
    return 1;
  }
  const result = unitsXlsxFromCsv(await readFile(csvFile, "utf8"));
  if (!result.ok) {
    console.error(`${csvFile} is not a valid units sheet:\n${result.errors.map((e) => `  ${e}`).join("\n")}`);
    return 1;
  }
  await writeFile(join(dir, "units.xlsx"), result.xlsx);
  for (const w of result.warnings) console.warn(`warning: ${w}`);
  console.log(`Wrote projects/${slug}/units.xlsx (${result.rows} units). Next: npm run validate -- ${slug}`);
  return 0;
}
