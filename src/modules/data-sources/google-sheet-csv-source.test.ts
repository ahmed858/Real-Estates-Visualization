import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { GoogleSheetCsvSource, googleSheetCsvUrl, UnitSourceError, UnitSourceReadError, type FetchLike } from "./index";

const SHEET_ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-xyz";
const fixture = (name: string) => readFile(new URL(`./__fixtures__/google-sheet/${name}`, import.meta.url), "utf8");

function csvResponse(body: string, status = 200, contentType = "text/csv; charset=utf-8"): Response {
  return new Response(body, { status, headers: { "content-type": contentType } });
}

function sourceAnswering(response: Response | (() => Promise<Response>)) {
  const fetchFn = vi.fn<FetchLike>(typeof response === "function" ? response : async () => response);
  return { source: new GoogleSheetCsvSource(SHEET_ID, "42", fetchFn), fetchFn };
}

async function rejectionOf(load: Promise<unknown>): Promise<unknown> {
  return load.then(
    () => {
      throw new Error("expected load to fail");
    },
    (e: unknown) => e,
  );
}

describe("googleSheetCsvUrl", () => {
  it("builds the CSV export link for one tab", () => {
    expect(googleSheetCsvUrl(SHEET_ID, "42")).toBe(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=42`);
  });
});

describe("GoogleSheetCsvSource", () => {
  it("reads and validates the rows, with Arabic text, quoted cells and sheet row numbers", async () => {
    const { source, fetchFn } = sourceAnswering(csvResponse(await fixture("units.csv")));
    const units = await source.load();

    expect(fetchFn).toHaveBeenCalledWith(googleSheetCsvUrl(SHEET_ID, "42"), { redirect: "manual" });
    expect(units.map((u) => [u.code, u.status, u.sheetRow])).toEqual([
      ["G-01", "available", 2],
      ["G-02", "reserved", 3],
      // A cell with a line break is still one spreadsheet row.
      ["F-01", "sold", 4],
    ]);
    expect(units[0]).toMatchObject({ type: "شقة", price: 1250000, notes: "ركن، إطلالة على الحديقة" });
    expect(units[1]).toMatchObject({ areaM2: 150.5, notes: "two lines\nof notes" });
    expect(units[2]).toMatchObject({ areaM2: 210, price: 3500000 });
    expect(units[2].notes).toBeUndefined();
  });

  it("reports invalid rows with their sheet row and column", async () => {
    const { source } = sourceAnswering(csvResponse(await fixture("units-invalid-row.csv")));
    const error = await rejectionOf(source.load());
    expect(error).toBeInstanceOf(UnitSourceError);
    expect((error as UnitSourceError).issues).toEqual([
      { row: 3, column: "area_m2", message: "must be a number" },
      { row: 3, column: "status", message: expect.stringContaining('"maybe" is not a known status') },
    ]);
  });

  it.each([
    ["a redirect to the sign-in page", csvResponse("", 307)],
    ["HTTP 401", csvResponse("", 401)],
    ["HTTP 403", csvResponse("", 403)],
    ["an HTML page instead of CSV", csvResponse("<html>Sign in</html>", 200, "text/html; charset=utf-8")],
  ])("explains how to share a sheet that answers with %s", async (_label, response) => {
    const error = await rejectionOf(sourceAnswering(response).source.load());
    expect(error).toBeInstanceOf(UnitSourceReadError);
    expect(error).toMatchObject({ kind: "not-shared", message: expect.stringContaining("Anyone with the link") });
  });

  it("reports a sheet id or gid that does not exist", async () => {
    const error = await rejectionOf(sourceAnswering(csvResponse("", 404)).source.load());
    expect(error).toMatchObject({ kind: "not-found", message: expect.stringContaining("units.sheetId") });
  });

  it("reports other HTTP errors with their status", async () => {
    const error = await rejectionOf(sourceAnswering(csvResponse("", 500)).source.load());
    expect(error).toMatchObject({ kind: "http", message: `Google Sheet ${SHEET_ID} (gid 42): Google answered HTTP 500` });
  });

  it("reports a network failure", async () => {
    const { source } = sourceAnswering(() => Promise.reject(new TypeError("fetch failed")));
    const error = await rejectionOf(source.load());
    expect(error).toMatchObject({ kind: "network", message: expect.stringContaining("fetch failed") });
  });
});
