import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { sheetTableFromRows, XlsxFileSource } from "@/modules/data-sources";
import { parseUnitsSheet } from "@/modules/schema";
import { runUnitsFromCsvCli, unitsXlsxFromCsv } from "./units-from-csv";

const HEADER = "code,scene,floor,type,bedrooms,bathrooms,area_m2,price,status";
const csv = (...rows: string[]) => [HEADER, ...rows].join("\n");

describe("unitsXlsxFromCsv", () => {
  it("builds an xlsx that reads back as the same units, keeping codes as text", async () => {
    const result = unitsXlsxFromCsv(csv("101,typical,1,Apartment,3,2,145.5,\"4,250,000\",متاح", "S-01,ground,0,Shop,0,1,85,6500000,sold"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toBe(2);
    const dir = await mkdtemp(join(tmpdir(), "units-csv-"));
    await writeFile(join(dir, "units.xlsx"), result.xlsx);
    const units = await new XlsxFileSource(join(dir, "units.xlsx")).load();
    expect(units.map((u) => [u.code, u.floor, u.areaM2, u.price, u.status])).toEqual([
      ["101", 1, 145.5, 4250000, "available"],
      ["S-01", 0, 85, 6500000, "sold"],
    ]);
  });

  it("reports invalid rows with their sheet row and column, and builds nothing", () => {
    const result = unitsXlsxFromCsv(csv("A-1,ground,0,Villa,4,4,300,1000,available", "A-2,ground,zero,Villa,4,4,300,1000,maybe"));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.startsWith("row 3, floor:"))).toBe(true);
    expect(result.errors.some((e) => e.startsWith("row 3, status:"))).toBe(true);
  });

  it("accepts the same rows the units sheet schema accepts", () => {
    const text = csv("G-01,ground,0,Apartment,3,2,145,4250000,reserved");
    const direct = parseUnitsSheet(sheetTableFromRows(text.split("\n").map((l) => l.split(","))));
    expect(direct.ok).toBe(unitsXlsxFromCsv(text).ok);
  });
});

describe("runUnitsFromCsvCli", () => {
  it("writes units.xlsx into an existing project folder", async () => {
    const projects = await mkdtemp(join(tmpdir(), "projects-"));
    await mkdir(join(projects, "tower"));
    const file = join(projects, "units.csv");
    await writeFile(file, csv("101,typical,1,Apartment,3,2,145,4250000,available"));
    vi.spyOn(console, "log").mockImplementation(() => {});
    expect(await runUnitsFromCsvCli(["tower", file], projects)).toBe(0);
    expect((await readFile(join(projects, "tower", "units.xlsx"))).length).toBeGreaterThan(0);
  });

  it("refuses a missing project and an invalid sheet", async () => {
    const projects = await mkdtemp(join(tmpdir(), "projects-"));
    await mkdir(join(projects, "tower"));
    const bad = join(projects, "bad.csv");
    await writeFile(bad, "code,scene\nA,b");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await runUnitsFromCsvCli(["nope", bad], projects)).toBe(1);
    expect(await runUnitsFromCsvCli(["tower", bad], projects)).toBe(1);
    expect(await runUnitsFromCsvCli(["tower"], projects)).toBe(2);
    expect(error).toHaveBeenCalled();
  });
});
