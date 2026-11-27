import { describe, expect, it } from "vitest";
import { formatSheetIssue, normaliseStatus, parseUnitsSheet, UNIT_COLUMNS, type SheetTable } from "../index";

const HEADER = [...UNIT_COLUMNS];
const row = (over: Partial<Record<(typeof UNIT_COLUMNS)[number], unknown>> = {}): unknown[] => {
  const base: Record<string, unknown> = {
    code: "G-01",
    scene: "ground",
    floor: 0,
    type: "Apartment",
    bedrooms: 3,
    bathrooms: 2,
    area_m2: 145.5,
    price: 4250000,
    status: "available",
    plan_image: "images/type-a.svg",
    notes: "Garden view",
    ...over,
  };
  return HEADER.map((c) => base[c]);
};
const table = (...rows: unknown[][]): SheetTable => ({ header: HEADER, rows });

function units(t: SheetTable) {
  const result = parseUnitsSheet(t);
  if (!result.ok) throw new Error(result.errors.map(formatSheetIssue).join("\n"));
  return result.value;
}
function errors(t: SheetTable) {
  const result = parseUnitsSheet(t);
  if (result.ok) throw new Error("expected the sheet to be invalid");
  return result.errors;
}

describe("parseUnitsSheet: valid sheets", () => {
  it("reads a full row into a typed unit with its sheet row number", () => {
    expect(units(table(row()))).toEqual([
      {
        code: "G-01",
        scene: "ground",
        floor: 0,
        type: "Apartment",
        bedrooms: 3,
        bathrooms: 2,
        areaM2: 145.5,
        price: 4250000,
        status: "available",
        planImage: "images/type-a.svg",
        notes: "Garden view",
        sheetRow: 2,
      },
    ]);
  });

  it("accepts columns in any order, any case, and without the optional columns", () => {
    const header = ["Status", " CODE ", "scene", "floor", "type", "bedrooms", "bathrooms", "area_m2", "price"];
    const [unit] = units({ header, rows: [["sold", "101", "f1", 1, "Duplex", 4, 3, 200, 0]] });
    expect(unit).toMatchObject({ code: "101", status: "sold", price: 0 });
    expect(unit.planImage).toBeUndefined();
    expect(unit.notes).toBeUndefined();
  });

  it("skips blank rows but keeps real sheet row numbers", () => {
    const result = units(table(row(), HEADER.map(() => ""), row({ code: "G-02" })));
    expect(result.map((u) => [u.code, u.sheetRow])).toEqual([
      ["G-01", 2],
      ["G-02", 4],
    ]);
  });

  it("honours a custom header row", () => {
    const [unit] = units({ header: HEADER, rows: [row()], headerRow: 3 });
    expect(unit.sheetRow).toBe(4);
  });
});

describe("parseUnitsSheet: column types", () => {
  it("coerces a numeric unit code to text", () => {
    expect(units(table(row({ code: 101 })))[0].code).toBe("101");
  });

  it("reads numbers written as text, with separators or Arabic-Indic digits", () => {
    const [unit] = units(table(row({ price: "4,250,000", area_m2: "١٤٥٫٥", bedrooms: "٣", floor: " 2 " })));
    expect(unit).toMatchObject({ price: 4250000, areaM2: 145.5, bedrooms: 3, floor: 2 });
  });

  it("accepts negative floors for basements", () => {
    expect(units(table(row({ floor: -1 })))[0].floor).toBe(-1);
  });

  it.each([
    ["floor", 1.5, "must be a whole number"],
    ["floor", "ground", "must be a whole number"],
    ["bedrooms", -1, "must not be negative"],
    ["bathrooms", 1.5, "must be a whole number"],
    ["area_m2", 0, "must be greater than 0"],
    ["area_m2", "big", "must be a number"],
    ["price", -5, "must not be negative"],
    ["scene", "Ground Floor", "must be a scene id: lowercase letters, digits and single dashes"],
    ["plan_image", "../x.svg", 'must not contain ".." segments'],
    ["gallery", "images/a.jpg; ../b.jpg", 'no path may contain ".." segments'],
    ["gallery", "/images/a.jpg", "every path must be relative to the project folder"],
    ["gallery", " ; ", "must list at least one image path"],
  ] as const)("rejects %s = %j", (column, value, message) => {
    expect(errors(table(row({ [column]: value })))).toEqual([{ row: 2, column, message }]);
  });

  it("reports every missing required cell in a row", () => {
    const issues = errors(table(row({ code: "", price: null, status: undefined })));
    expect(issues).toEqual([
      { row: 2, column: "code", message: "is required" },
      { row: 2, column: "price", message: "is required" },
      { row: 2, column: "status", message: "is required" },
    ]);
  });
});

describe("status normalisation", () => {
  it.each([
    ["available", "available"],
    ["Available ", "available"],
    ["متاح", "available"],
    ["متاحة", "available"],
    ["RESERVED", "reserved"],
    ["محجوز", "reserved"],
    ["محجـوز", "reserved"],
    ["sold", "sold"],
    ["مباع", "sold"],
    ["مُباع", "sold"],
    ["تم  البيع", "sold"],
  ])("%j -> %s", (input, expected) => {
    expect(normaliseStatus(input)).toBe(expected);
  });

  it("rejects an unknown status with a hint listing accepted spellings", () => {
    const [issue] = errors(table(row({ status: "on hold" })));
    expect(issue).toMatchObject({ row: 2, column: "status" });
    expect(issue.message).toContain('"on hold" is not a known status');
    expect(issue.message).toContain("متاح");
  });
});

describe("parseUnitsSheet: sheet-level errors", () => {
  it("rejects a unit code used twice and points at the first row", () => {
    expect(errors(table(row(), row({ code: "G-02" }), row()))).toEqual([
      { row: 4, column: "code", message: 'duplicate unit code "G-01" (first used in row 2)' },
    ]);
  });

  it("reports missing required columns on the header row", () => {
    const header = HEADER.filter((c) => c !== "price" && c !== "status");
    expect(errors({ header, rows: [] })).toEqual([
      { row: 1, column: "price", message: 'required column "price" is missing' },
      { row: 1, column: "status", message: 'required column "status" is missing' },
    ]);
  });

  it("rejects a duplicated column and warns about unknown columns", () => {
    const result = parseUnitsSheet({ header: [...HEADER, "price", "view"], rows: [] });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual([{ row: 1, column: "price", message: 'column "price" appears more than once' }]);
    expect(result.warnings).toEqual([{ row: 1, column: "view", message: 'unknown column "view" is ignored' }]);
  });

  it("formats issues for a readable report", () => {
    expect(formatSheetIssue({ row: 4, column: "price", message: "must be a number" })).toBe(
      "row 4, price: must be a number",
    );
  });
});

describe("parseUnitsSheet: gallery column", () => {
  it("splits the photo paths on ';', trimming spaces and empty parts", () => {
    const [unit] = units(table(row({ gallery: " images/g01-1.jpg ;images/g01-2.jpg; " })));
    expect(unit.gallery).toEqual(["images/g01-1.jpg", "images/g01-2.jpg"]);
  });

  it("is optional: a blank cell or a sheet without the column has no gallery", () => {
    expect(units(table(row()))[0]).not.toHaveProperty("gallery");
    const header = HEADER.filter((c) => c !== "gallery");
    const [unit] = units({ header, rows: [header.map((c) => (c === "code" ? "G-01" : row()[HEADER.indexOf(c)]))] });
    expect(unit).not.toHaveProperty("gallery");
  });
});

