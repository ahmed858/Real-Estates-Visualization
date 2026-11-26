// Converts raw spreadsheet rows (first row = header) into the table the units schema validates.
import type { SheetTable } from "@/modules/schema";

/** Treats the first row as the header (sheet row 1) and the rest as data rows. */
export function sheetTableFromRows(rows: readonly (readonly unknown[])[]): SheetTable {
  const [header = [], ...data] = rows;
  return { header, rows: data, headerRow: 1 };
}
