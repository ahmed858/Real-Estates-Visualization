import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { sheetTableFromRows, UnitSourceError, XlsxFileSource, type UnitSource } from "./index";

const fixture = (name: string) => fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url));

describe("XlsxFileSource", () => {
  it("reads valid units from the first sheet only, keeping sheet row numbers", async () => {
    const source: UnitSource = new XlsxFileSource(fixture("units-english.xlsx"));
    const units = await source.load();
    expect(units.map((u) => [u.code, u.status, u.sheetRow])).toEqual([
      ["G-01", "available", 2],
      ["G-02", "reserved", 3],
      ["F-01", "sold", 5],
    ]);
    expect(units[0]).toMatchObject({ areaM2: 145.5, price: 4250000, planImage: "images/type-a.svg", notes: "Garden view" });
  });

  it("reads Arabic statuses, numeric codes and Arabic-Indic digits", async () => {
    const units = await new XlsxFileSource(fixture("units-arabic-status.xlsx")).load();
    expect(units.map((u) => [u.code, u.status])).toEqual([
      ["101", "available"],
      ["102", "reserved"],
      ["201", "sold"],
    ]);
    expect(units[0].areaM2).toBe(95);
    expect(units[1].price).toBe(1900000);
  });

  it("rejects an invalid row with row and column of each problem", async () => {
    const load = new XlsxFileSource(fixture("units-invalid-row.xlsx")).load();
    await expect(load).rejects.toBeInstanceOf(UnitSourceError);
    const error = (await load.catch((e: unknown) => e)) as UnitSourceError;
    expect(error.issues).toEqual([
      { row: 3, column: "area_m2", message: "must be a number" },
      { row: 3, column: "status", message: expect.stringContaining('"on hold" is not a known status') },
    ]);
    expect(error.message).toContain("units-invalid-row.xlsx");
  });

  it("rejects when the file does not exist", async () => {
    await expect(new XlsxFileSource(fixture("missing.xlsx")).load()).rejects.toThrow();
  });
});

describe("sheetTableFromRows", () => {
  it("uses the first row as header", () => {
    expect(sheetTableFromRows([["code"], ["A"]])).toEqual({ header: ["code"], rows: [["A"]], headerRow: 1 });
  });

  it("handles an empty sheet", () => {
    expect(sheetTableFromRows([])).toEqual({ header: [], rows: [], headerRow: 1 });
  });
});
