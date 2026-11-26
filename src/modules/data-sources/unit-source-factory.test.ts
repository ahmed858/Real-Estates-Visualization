import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createUnitSource, UnsupportedUnitSourceError, XlsxFileSource } from "./index";

const demoVilla = fileURLToPath(new URL("../../../projects/demo-villa", import.meta.url));

describe("createUnitSource", () => {
  it("reads the project's units.xlsx for the xlsx source", async () => {
    const source = createUnitSource({ source: "xlsx" }, demoVilla);
    expect(source).toBeInstanceOf(XlsxFileSource);
    expect((await source.load()).map((u) => u.code)).toEqual(["G-01", "G-02", "F-01", "F-02", "R-01"]);
  });

  it("reports a Google Sheet as not supported yet", () => {
    const create = () => createUnitSource({ source: "google-sheet", sheetId: "x".repeat(44), gid: "0" }, demoVilla);
    expect(create).toThrow(UnsupportedUnitSourceError);
    expect(create).toThrow('units source "google-sheet" is not supported yet');
  });
});
