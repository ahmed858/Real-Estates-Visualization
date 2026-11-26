// Public entry point of the `data-sources` module.
// Reading unit status from a spreadsheet (.xlsx, Google Sheets) behind one interface.
// Other modules may import ONLY from "@/modules/data-sources" (this file), never from files inside it.
export { UnitSourceError } from "./unit-source";
export type { UnitSource } from "./unit-source";
export { XlsxFileSource } from "./xlsx-file-source";
export { sheetTableFromRows } from "./sheet-table";
