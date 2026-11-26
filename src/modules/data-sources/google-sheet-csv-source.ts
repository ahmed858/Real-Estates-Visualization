// Adapter: reads unit rows from a Google Sheet shared as "anyone with the link
// can view", through the sheet's public CSV export. No credentials involved.
import { parseUnitsSheet, type UnitRow } from "@/modules/schema";
import { parseCsv } from "./csv";
import { sheetTableFromRows } from "./sheet-table";
import { UnitSourceError, UnitSourceReadError, type UnitSource } from "./unit-source";

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export function googleSheetCsvUrl(sheetId: string, gid: string): string {
  return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/export?format=csv&gid=${encodeURIComponent(gid)}`;
}

const NOT_SHARED = 'the sheet is not shared: in Google Sheets choose Share > General access > "Anyone with the link" (Viewer)';

export class GoogleSheetCsvSource implements UnitSource {
  private readonly label: string;

  constructor(
    private readonly sheetId: string,
    private readonly gid: string = "0",
    private readonly fetchFn: FetchLike = (url, init) => fetch(url, init),
  ) {
    this.label = `Google Sheet ${sheetId} (gid ${gid})`;
  }

  async load(): Promise<UnitRow[]> {
    const result = parseUnitsSheet(sheetTableFromRows(parseCsv(await this.readCsv())));
    if (!result.ok) throw new UnitSourceError(this.label, result.errors);
    return result.value;
  }

  private async readCsv(): Promise<string> {
    let response: Response;
    try {
      // A private sheet answers with a redirect to the Google sign-in page; do not follow it.
      response = await this.fetchFn(googleSheetCsvUrl(this.sheetId, this.gid), { redirect: "manual" });
    } catch (e) {
      throw new UnitSourceReadError(this.label, "network", `cannot be reached: ${(e as Error).message}`);
    }

    const { status } = response;
    if ((status >= 300 && status < 400) || status === 401 || status === 403) {
      throw new UnitSourceReadError(this.label, "not-shared", NOT_SHARED);
    }
    if (status === 404) throw new UnitSourceReadError(this.label, "not-found", "no sheet with this id and gid (check units.sheetId and units.gid)");
    if (!response.ok) throw new UnitSourceReadError(this.label, "http", `Google answered HTTP ${status}`);
    // A sign-in or error page instead of CSV also means the sheet is not readable by link.
    if ((response.headers.get("content-type") ?? "").includes("text/html")) {
      throw new UnitSourceReadError(this.label, "not-shared", NOT_SHARED);
    }
    return response.text();
  }
}
