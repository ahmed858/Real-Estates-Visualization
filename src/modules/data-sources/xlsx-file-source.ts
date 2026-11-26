// Adapter: reads unit rows from the first sheet of a local .xlsx file.
import { readSheet } from "read-excel-file/node";
import { parseUnitsSheet, type UnitRow } from "@/modules/schema";
import { sheetTableFromRows } from "./sheet-table";
import { UnitSourceError, type UnitSource } from "./unit-source";

export class XlsxFileSource implements UnitSource {
  constructor(private readonly filePath: string) {}

  async load(): Promise<UnitRow[]> {
    const rows = await readSheet(this.filePath);
    const result = parseUnitsSheet(sheetTableFromRows(rows));
    if (!result.ok) throw new UnitSourceError(this.filePath, result.errors);
    return result.value;
  }
}
