import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { XlsxFileSource } from "@/modules/data-sources";
import { buildXlsx } from "./write-xlsx";

const header = ["code", "scene", "floor", "type", "bedrooms", "bathrooms", "area_m2", "price", "status", "plan_image", "notes"];

describe("buildXlsx", () => {
  it("writes a workbook that the .xlsx unit source reads back", async () => {
    const dir = await mkdtemp(join(tmpdir(), "xlsx-"));
    const file = join(dir, "units.xlsx");
    await writeFile(file, buildXlsx([header, ["G-01", "ground", 0, "Apartment", 2, 1, 106.5, 3500000, "محجوز", null, "A & B <ok>"]], "Units"));
    const units = await new XlsxFileSource(file).load();
    expect(units).toEqual([
      { code: "G-01", scene: "ground", floor: 0, type: "Apartment", bedrooms: 2, bathrooms: 1, areaM2: 106.5, price: 3500000, status: "reserved", notes: "A & B <ok>", sheetRow: 2 },
    ]);
  });

  it("produces identical bytes for identical input", () => {
    const rows = [header, ["X", "s", 1, "t", 1, 1, 1, 1, "sold"]];
    expect(buildXlsx(rows).equals(buildXlsx(rows))).toBe(true);
  });

  it("rejects non-finite numbers", () => {
    expect(() => buildXlsx([[Number.NaN]])).toThrow("cell A1");
  });
});
