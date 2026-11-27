// Public entry point of the `data-sources` module.
// Reading unit status from a spreadsheet (.xlsx, Google Sheets) behind one interface.
// Other modules may import ONLY from "@/modules/data-sources" (this file), never from files inside it.
export { UnitSourceError, UnitSourceReadError } from "./unit-source";
export type { LoadedUnits, StaleUnits, UnitSource, UnitSourceReadErrorKind } from "./unit-source";
export { LastGoodUnitSource } from "./last-good-unit-source";
export type { ProblemLogger } from "./last-good-unit-source";
export { GoogleSheetCsvSource, googleSheetCsvUrl } from "./google-sheet-csv-source";
export type { FetchLike } from "./google-sheet-csv-source";
export { XlsxFileSource } from "./xlsx-file-source";
export { sheetTableFromRows } from "./sheet-table";
export { ProjectSourceError } from "./project-source";
export type { LoadedProject, ProjectSource, ProjectSourceErrorKind } from "./project-source";
export { FileProjectSource, PROJECT_CONFIG_FILE } from "./file-project-source";
export { isPreviewEnabled, PREVIEW_PROJECTS_ENV, PublishedProjectSource } from "./published-project-source";
export type { PublishedProjectSourceOptions } from "./published-project-source";
export { createUnitSource, createUnitSourceFactory, PROJECT_UNITS_FILE, UnsupportedUnitSourceError } from "./unit-source-factory";
export type { UnitSourceFactory, UnitSourceFactoryOptions } from "./unit-source-factory";
export { CachedUnitSource } from "./cached-unit-source";
export type { Clock } from "./cached-unit-source";
export { IMAGE_CONTENT_TYPES, listProjectImages, PROJECT_IMAGES_DIR, readProjectImage } from "./project-files";
export type { ProjectFile, ProjectImage } from "./project-files";
export { readImageSize } from "./image-size";
