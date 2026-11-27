// The units sheet: fixed columns, one row per unit.
// parseUnitsSheet validates a raw table (header row + data rows) as read from any spreadsheet.
import type { z } from "zod";
import {
  countCell,
  filePathCell,
  galleryCell,
  galleryPaths,
  integerCell,
  isBlank,
  nonNegativeNumberCell,
  positiveNumberCell,
  sceneIdCell,
  textCell,
} from "./cells";
import { normaliseStatus, STATUS_SPELLINGS, UNIT_STATUSES, type UnitStatus } from "./status";

export interface UnitRow {
  code: string;
  scene: string;
  floor: number;
  type: string;
  bedrooms: number;
  bathrooms: number;
  areaM2: number;
  price: number;
  status: UnitStatus;
  planImage?: string;
  /** Unit photos (project file paths), from the `gallery` column. */
  gallery?: string[];
  notes?: string;
  /** Row number in the sheet (1-based, as the spreadsheet app shows it). */
  sheetRow: number;
}

/** Sheet columns in their fixed order. */
export const UNIT_COLUMNS = [
  "code",
  "scene",
  "floor",
  "type",
  "bedrooms",
  "bathrooms",
  "area_m2",
  "price",
  "status",
  "plan_image",
  "gallery",
  "notes",
] as const;
export type UnitColumn = (typeof UNIT_COLUMNS)[number];

export const OPTIONAL_UNIT_COLUMNS: readonly UnitColumn[] = ["plan_image", "gallery", "notes"];
export const REQUIRED_UNIT_COLUMNS: readonly UnitColumn[] = UNIT_COLUMNS.filter(
  (c) => !OPTIONAL_UNIT_COLUMNS.includes(c),
);

export interface SheetTable {
  /** The header row cells. */
  header: readonly unknown[];
  /** Data rows, in sheet order, directly below the header. */
  rows: readonly (readonly unknown[])[];
  /** Sheet row number of the header. Defaults to 1. */
  headerRow?: number;
}

export interface SheetIssue {
  /** Sheet row number (1-based). */
  row: number;
  /** Column name, when the issue belongs to one column. */
  column?: string;
  message: string;
}

export type SheetParseResult =
  | { ok: true; value: UnitRow[]; warnings: SheetIssue[] }
  | { ok: false; errors: SheetIssue[]; warnings: SheetIssue[] };

type CellSchema = z.ZodType<string | number>;

const CELL_SCHEMAS: Record<Exclude<UnitColumn, "status">, CellSchema> = {
  code: textCell,
  scene: sceneIdCell,
  floor: integerCell,
  type: textCell,
  bedrooms: countCell,
  bathrooms: countCell,
  area_m2: positiveNumberCell,
  price: nonNegativeNumberCell,
  plan_image: filePathCell,
  gallery: galleryCell,
  notes: textCell,
};

const STATUS_HINT = UNIT_STATUSES.map((s) => STATUS_SPELLINGS[s].slice(0, 2).join("/")).join(", ");

function headerName(cell: unknown): string {
  return typeof cell === "string" ? cell.trim().toLowerCase() : "";
}

/** Maps each known column to its index; reports missing, duplicate and unknown columns. */
function readHeader(table: SheetTable, headerRow: number) {
  const index = new Map<UnitColumn, number>();
  const errors: SheetIssue[] = [];
  const warnings: SheetIssue[] = [];
  table.header.forEach((cell, i) => {
    const name = headerName(cell);
    if (name === "") return;
    if (!(UNIT_COLUMNS as readonly string[]).includes(name)) {
      warnings.push({ row: headerRow, column: name, message: `unknown column "${name}" is ignored` });
      return;
    }
    const column = name as UnitColumn;
    if (index.has(column)) {
      errors.push({ row: headerRow, column, message: `column "${column}" appears more than once` });
      return;
    }
    index.set(column, i);
  });
  for (const column of REQUIRED_UNIT_COLUMNS) {
    if (!index.has(column)) errors.push({ row: headerRow, column, message: `required column "${column}" is missing` });
  }
  return { index, errors, warnings };
}

function readRow(cells: readonly unknown[], row: number, index: Map<UnitColumn, number>) {
  const errors: SheetIssue[] = [];
  const values: Partial<Record<UnitColumn, string | number>> = {};
  let status: UnitStatus | null = null;

  for (const column of UNIT_COLUMNS) {
    const at = index.get(column);
    const raw = at === undefined ? undefined : cells[at];
    if (isBlank(raw)) {
      if (!OPTIONAL_UNIT_COLUMNS.includes(column)) errors.push({ row, column, message: "is required" });
      continue;
    }
    if (column === "status") {
      status = normaliseStatus(raw);
      if (!status) errors.push({ row, column, message: `"${String(raw)}" is not a known status (use ${STATUS_HINT})` });
      continue;
    }
    const parsed = CELL_SCHEMAS[column].safeParse(raw);
    if (parsed.success) values[column] = parsed.data;
    else errors.push({ row, column, message: parsed.error.issues[0]?.message ?? "is invalid" });
  }

  if (errors.length > 0 || !status) return { errors };
  const unit: UnitRow = {
    code: values.code as string,
    scene: values.scene as string,
    floor: values.floor as number,
    type: values.type as string,
    bedrooms: values.bedrooms as number,
    bathrooms: values.bathrooms as number,
    areaM2: values.area_m2 as number,
    price: values.price as number,
    status,
    sheetRow: row,
  };
  if (values.plan_image !== undefined) unit.planImage = values.plan_image as string;
  if (values.gallery !== undefined) unit.gallery = galleryPaths(values.gallery as string);
  if (values.notes !== undefined) unit.notes = values.notes as string;
  return { errors, unit };
}

/**
 * Validates a units sheet. Blank rows are skipped. Never throws; every error
 * names the sheet row number and column so the owner can find it in the spreadsheet.
 */
export function parseUnitsSheet(table: SheetTable): SheetParseResult {
  const headerRow = table.headerRow ?? 1;
  const header = readHeader(table, headerRow);
  if (header.errors.length > 0) return { ok: false, errors: header.errors, warnings: header.warnings };

  const errors: SheetIssue[] = [];
  const units: UnitRow[] = [];
  const firstRowOfCode = new Map<string, number>();

  table.rows.forEach((cells, i) => {
    if (cells.every(isBlank)) return;
    const row = headerRow + 1 + i;
    const result = readRow(cells, row, header.index);
    errors.push(...result.errors);
    if (!result.unit) return;
    const first = firstRowOfCode.get(result.unit.code);
    if (first !== undefined) {
      errors.push({ row, column: "code", message: `duplicate unit code "${result.unit.code}" (first used in row ${first})` });
      return;
    }
    firstRowOfCode.set(result.unit.code, row);
    units.push(result.unit);
  });

  if (errors.length > 0) return { ok: false, errors, warnings: header.warnings };
  return { ok: true, value: units, warnings: header.warnings };
}

/** Formats an issue as "row 4, price: must be a number". */
export function formatSheetIssue(issue: SheetIssue): string {
  return `row ${issue.row}${issue.column ? `, ${issue.column}` : ""}: ${issue.message}`;
}
