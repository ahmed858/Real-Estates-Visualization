import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createSceneTree } from "@/modules/domain";
import { parseProjectConfig, type SceneInput, type UnitRow } from "@/modules/schema";
import { towerUnits } from "../__fixtures__/typical-tower";
import { UnitsTable, formatPrice, sortUnits, unitTableRows, type UnitTableRow } from "../index";

const villaRows: UnitTableRow[] = [
  { code: "G-02", type: "Villa", floor: 0, bedrooms: 3, bathrooms: 2, areaM2: 160, price: 4400000, status: "sold", href: "/p/demo/ground?unit=G-02" },
  { code: "R-01", type: "Annex", floor: 2, bedrooms: 1, bathrooms: 1, areaM2: 58.5, price: 2200000, status: "available", href: "/p/demo/roof?unit=R-01" },
  { code: "G-01", type: "Villa", floor: 0, bedrooms: 3, bathrooms: 2, areaM2: 150, price: 4000000, status: "reserved", href: "/p/demo/ground?unit=G-01" },
  { code: "F-01", type: "Apartment", floor: 1, bedrooms: 2, bathrooms: 1, areaM2: 106, price: 3600000, status: "available", href: "/p/demo/first?unit=F-01" },
];

const codes = () => screen.getAllByRole("row").slice(1).map((r) => r.getAttribute("data-unit"));
const header = (name: string) => screen.getByRole("columnheader", { name: new RegExp(name) });

describe("sortUnits", () => {
  it("sorts by each column, ties broken by code", () => {
    const by = (key: Parameters<typeof sortUnits>[1], dir: "asc" | "desc" = "asc") => sortUnits(villaRows, key, dir).map((u) => u.code);
    expect(by("code")).toEqual(["F-01", "G-01", "G-02", "R-01"]);
    expect(by("floor")).toEqual(["G-01", "G-02", "F-01", "R-01"]);
    expect(by("price", "desc")).toEqual(["G-02", "G-01", "F-01", "R-01"]);
    expect(by("areaM2")).toEqual(["R-01", "F-01", "G-01", "G-02"]);
    expect(by("status")).toEqual(["F-01", "R-01", "G-01", "G-02"]);
    expect(by("type")).toEqual(["R-01", "F-01", "G-01", "G-02"]);
    expect(by("bedrooms", "desc")).toEqual(["G-01", "G-02", "F-01", "R-01"]);
  });

  it("compares codes with numbers in numeric order", () => {
    const rows = ["10A", "2A", "1B"].map((code) => ({ ...villaRows[0], code }));
    expect(sortUnits(rows, "code", "asc").map((u) => u.code)).toEqual(["1B", "2A", "10A"]);
  });
});

describe("UnitsTable", () => {
  it("lists every unit sorted by code, with its facts and status as in the legend", () => {
    render(<UnitsTable rows={villaRows} currency="EGP" locale="en" />);
    expect(screen.getAllByRole("columnheader").map((th) => th.textContent?.replace(/[▲▼]/g, ""))).toEqual(["Unit", "Floor", "Type", "Bedrooms", "Area", "Price", "Status"]);
    expect(codes()).toEqual(["F-01", "G-01", "G-02", "R-01"]);
    const row = screen.getAllByRole("row")[1];
    expect(within(row).getAllByRole("cell").map((c) => c.textContent)).toEqual(["F-01", "1", "Apartment", "2", "106 m²", formatPrice(3600000, "EGP", "en"), "Available"]);
    expect(row.querySelector('[data-swatch="available"]')).not.toBeNull();
    expect(header("Unit").getAttribute("aria-sort")).toBe("ascending");
  });

  it("sorts by a column on click, and reverses on a second click", () => {
    render(<UnitsTable rows={villaRows} currency="EGP" locale="en" />);
    fireEvent.click(within(header("Price")).getByRole("button"));
    expect(codes()).toEqual(["R-01", "F-01", "G-01", "G-02"]);
    expect(header("Price").getAttribute("aria-sort")).toBe("ascending");
    expect(header("Unit").getAttribute("aria-sort")).toBe("none");
    fireEvent.click(within(header("Price")).getByRole("button"));
    expect(codes()).toEqual(["G-02", "G-01", "F-01", "R-01"]);
    expect(header("Price").getAttribute("aria-sort")).toBe("descending");
    fireEvent.click(within(header("Status")).getByRole("button"));
    expect(codes()).toEqual(["F-01", "R-01", "G-01", "G-02"]);
  });

  it("links each row's code to the unit on its scene", () => {
    render(<UnitsTable rows={villaRows} currency="EGP" locale="en" />);
    expect(screen.getByRole("link", { name: "G-01" }).getAttribute("href")).toBe("/p/demo/ground?unit=G-01");
    expect(screen.getAllByRole("link")).toHaveLength(4);
  });

  it("uses Arabic headings, digits and status labels in Arabic", () => {
    render(<UnitsTable rows={Object.values(towerUnits).map((u) => ({ ...u, href: `/p/t/typical?unit=${u.code}` }))} currency="EGP" locale="ar" />);
    expect(header("الوحدة")).toBeTruthy();
    expect(codes()).toEqual(["1A", "1B", "2A", "2B", "3A", "3B"]);
    expect(within(screen.getAllByRole("row")[1]).getByText("مباع")).toBeTruthy();
    expect(within(screen.getAllByRole("row")[1]).getAllByRole("cell")[1].textContent).toBe("١");
  });
});

describe("unitTableRows", () => {
  const scene = (id: string, kind: SceneInput["kind"], rest: Partial<SceneInput> = {}): SceneInput => ({
    id,
    kind,
    title: { ar: id, en: id },
    image: { path: `images/${id}.svg`, width: 100, height: 100 },
    ...rest,
  });
  const square: [number, number][] = [[0, 0], [10, 0], [10, 10], [0, 10]];
  const parsed = parseProjectConfig({
    schemaVersion: 1,
    project: { slug: "t", name: { ar: "ت", en: "T" }, defaultLocale: "en", currency: "EGP", contact: { whatsapp: "+201001234567" }, branding: { logo: "l.svg", primaryColor: "#000000", accentColor: "#ffffff" } },
    root: scene("facade", "facade", {
      hotspots: [{ id: "to-typ", points: square, target: { scene: "typical" } }, { id: "to-g", points: square, target: { scene: "ground" } }],
      children: [
        scene("typical", "floor", { floors: { from: 1, to: 2, unitCode: "{floor}{suffix}" }, hotspots: [{ id: "a", points: square, target: { unitSuffix: "A" } }] }),
        scene("ground", "floor", { hotspots: [{ id: "g", points: square, target: { unit: "G-01" } }, { id: "g-again", points: square, target: { unit: "G-01" } }] }),
      ],
    }),
  });
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.errors));
  const tree = createSceneTree(parsed.value);
  let n = 1;
  const row = (code: string, floor: number): UnitRow => ({ code, scene: "x", floor, type: "Apartment", bedrooms: 2, bathrooms: 1, areaM2: 100, price: 1, status: "available", sheetRow: ++n });

  it("gives one row per drawn unit with a link to its scene, typical floors carrying the floor", () => {
    const rows = unitTableRows(tree, [row("G-01", 0), row("1A", 1), row("2A", 2), row("Z-99", 9)], (sceneId, code, floor) => `${sceneId}|${code}|${floor ?? "-"}`);
    expect(rows.map((r) => [r.code, r.href])).toEqual([
      ["1A", "typical|1A|1"],
      ["2A", "typical|2A|2"],
      ["G-01", "ground|G-01|-"],
    ]);
    expect(rows[0]).toMatchObject({ type: "Apartment", floor: 1, status: "available" });
    expect(rows[0]).not.toHaveProperty("sheetRow");
  });
});
