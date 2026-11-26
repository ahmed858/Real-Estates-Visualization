// Factory Method: turns the `units` block of project.json into the UnitSource
// adapter that reads it. The only place that knows which sources exist, so
// adding one never touches FileProjectSource or the viewer.
import { join } from "node:path";
import type { UnitsSource } from "@/modules/schema";
import { CachedUnitSource, type Clock } from "./cached-unit-source";
import { GoogleSheetCsvSource, type FetchLike } from "./google-sheet-csv-source";
import { LastGoodUnitSource, type ProblemLogger } from "./last-good-unit-source";
import type { UnitSource } from "./unit-source";
import { XlsxFileSource } from "./xlsx-file-source";

export const PROJECT_UNITS_FILE = "units.xlsx";

export type UnitSourceFactory = (units: UnitsSource, projectDir: string) => UnitSource;

/** The config names a source this build cannot read yet. */
export class UnsupportedUnitSourceError extends Error {
  constructor(readonly source: UnitsSource["source"]) {
    super(`units source "${source}" is not supported yet`);
    this.name = "UnsupportedUnitSourceError";
  }
}

export interface UnitSourceFactoryOptions {
  now?: Clock;
  fetch?: FetchLike;
  log?: ProblemLogger;
}

/**
 * Builds a factory that keeps one source per Google Sheet tab and refresh
 * interval for its whole lifetime, so the cache and the last good rows
 * survive across page requests. A sheet is read through
 * LastGood(Cached(GoogleSheetCsv)). The local units.xlsx is read on every request (no network cost).
 */
export function createUnitSourceFactory(options: UnitSourceFactoryOptions = {}): UnitSourceFactory {
  const sheets = new Map<string, UnitSource>();
  return (units, projectDir) => {
    switch (units.source) {
      case "xlsx":
        return new XlsxFileSource(join(projectDir, PROJECT_UNITS_FILE));
      case "google-sheet": {
        const key = `${units.sheetId}#${units.gid}@${units.refreshSeconds}`;
        let source = sheets.get(key);
        if (!source) {
          const sheet = new GoogleSheetCsvSource(units.sheetId, units.gid, options.fetch);
          const cached = new CachedUnitSource(sheet, units.refreshSeconds * 1000, options.now);
          source = new LastGoodUnitSource(cached, `Google Sheet ${units.sheetId} (gid ${units.gid})`, options.now, options.log);
          sheets.set(key, source);
        }
        return source;
      }
      default:
        throw new UnsupportedUnitSourceError((units as { source: UnitsSource["source"] }).source);
    }
  };
}

/** The factory the app uses: one cache per server instance. */
export const createUnitSource: UnitSourceFactory = createUnitSourceFactory();
