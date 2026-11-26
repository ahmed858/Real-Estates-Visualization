import { describe, expect, it } from "vitest";
import { parseProjectConfig, type ProjectConfigInput } from "../index";

const SHEET_ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-xyz";

function project(units?: unknown): ProjectConfigInput {
  const config = {
    schemaVersion: 1,
    project: {
      slug: "demo-villa",
      name: { ar: "فيلا تجريبية", en: "Demo Villa" },
      defaultLocale: "ar",
      currency: "EGP",
      contact: { whatsapp: "+201001234567" },
      branding: { logo: "images/logo.svg", primaryColor: "#1a6b4f", accentColor: "#c89b3c" },
    },
    root: { id: "facade", kind: "facade", title: { ar: "الواجهة", en: "Facade" }, image: { path: "images/f.svg", width: 10, height: 10 } },
  };
  return (units === undefined ? config : { ...config, units }) as ProjectConfigInput;
}

function parse(units?: unknown) {
  return parseProjectConfig(project(units));
}

function errorsOf(units: unknown) {
  const result = parse(units);
  if (result.ok) throw new Error("expected the config to be invalid");
  return result.errors;
}

describe("project.json units source", () => {
  it("is optional, so existing projects keep their units.xlsx", () => {
    const result = parse();
    expect(result.ok && result.value.units).toBeUndefined();
  });

  it("accepts the xlsx form", () => {
    const result = parse({ source: "xlsx" });
    expect(result.ok && result.value.units).toEqual({ source: "xlsx" });
  });

  it("accepts a Google Sheet and defaults gid to the first tab", () => {
    const result = parse({ source: "google-sheet", sheetId: SHEET_ID });
    expect(result.ok && result.value.units).toEqual({ source: "google-sheet", sheetId: SHEET_ID, gid: "0" });
  });

  it("keeps an explicit gid", () => {
    const result = parse({ source: "google-sheet", sheetId: SHEET_ID, gid: "123456789" });
    expect(result.ok && result.value.units).toMatchObject({ gid: "123456789" });
  });

  it("rejects an unknown source", () => {
    expect(errorsOf({ source: "airtable" })[0].path).toBe("units.source");
  });

  it("rejects a Google Sheet without a sheet id", () => {
    expect(errorsOf({ source: "google-sheet" })).toEqual([{ path: "units.sheetId", message: expect.any(String) }]);
  });

  it.each([
    ["a full link instead of the id", `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`],
    ["a short id", "abc"],
  ])("rejects %s with a hint", (_label, sheetId) => {
    const [error] = errorsOf({ source: "google-sheet", sheetId });
    expect(error.path).toBe("units.sheetId");
    expect(error.message).toMatch(/id from the sheet link/);
  });

  it.each(["", "first", "-1", 0])("rejects gid %j", (gid) => {
    expect(errorsOf({ source: "google-sheet", sheetId: SHEET_ID, gid })[0].path).toBe("units.gid");
  });

  it("rejects unknown fields and fields of the other form", () => {
    expect(errorsOf({ source: "xlsx", sheetId: SHEET_ID })[0].path).toBe("units");
    expect(errorsOf({ source: "google-sheet", sheetId: SHEET_ID, tab: "Units" })[0].path).toBe("units");
  });
});
