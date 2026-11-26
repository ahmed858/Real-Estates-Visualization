// Public entry point of the `data-sources` module.
// Reading unit status from a spreadsheet (.xlsx, Google Sheets) behind one interface.
// Other modules may import ONLY from "@/modules/data-sources" (this file), never from files inside it.
export { UnitSourceError, UnitSourceReadError } from "./unit-source";
export type { UnitSource, UnitSourceReadErrorKind } from "./unit-source";
export { GoogleSheetCsvSource, googleSheetCsvUrl } from "./google-sheet-csv-source";
export type { FetchLike } from "./google-sheet-csv-source";
export { XlsxFileSource } from "./xlsx-file-source";
export { sheetTableFromRows } from "./sheet-table";
export { ProjectSourceError } from "./project-source";
export type { LoadedProject, ProjectSource, ProjectSourceErrorKind } from "./project-source";
export { FileProjectSource, PROJECT_CONFIG_FILE } from "./file-project-source";
export { createUnitSource, PROJECT_UNITS_FILE, UnsupportedUnitSourceError } from "./unit-source-factory";
export type { UnitSourceFactory } from "./unit-source-factory";
export { IMAGE_CONTENT_TYPES, readProjectImage } from "./project-files";
export type { ProjectFile } from "./project-files";
