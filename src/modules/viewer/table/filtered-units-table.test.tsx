import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { FilteredUnitsTable, filterToParams, parseFilter, type UnitTableRow } from "../index";

const row = (code: string, floor: number, type: string, bedrooms: number, areaM2: number, price: number, status: UnitTableRow["status"]): UnitTableRow => ({
  code,
  floor,
  type,
  bedrooms,
  bathrooms: 1,
  areaM2,
  price,
  status,
  href: `/p/demo/s?unit=${code}`,
});

const rows = [
  row("G-01", 0, "Villa", 3, 150, 4000000, "available"),
  row("G-02", 0, "Villa", 3, 160, 4400000, "sold"),
  row("F-01", 1, "Apartment", 2, 106, 3600000, "reserved"),
  row("F-02", 1, "Apartment", 2, 104, 3650000, "available"),
  row("R-01", 2, "Annex", 1, 58.5, 2200000, "available"),
];

const shown = () =>
  screen
    .queryAllByRole("row")
    .slice(1)
    .map((r) => r.getAttribute("data-unit"));
const bar = () => screen.getByRole("search", { name: "Filter units" });
const group = (name: string) => within(bar()).getByRole("group", { name: new RegExp(`^${name}`) });
const query = () => new URLSearchParams(window.location.search);

beforeEach(() => {
  window.history.replaceState(null, "", "/p/demo/units");
});

describe("parseFilter / filterToParams", () => {
  it("round-trips every field through the URL", () => {
    const filter = { status: ["available", "sold"] as const, type: ["Villa"], bedrooms: [2, 3], floor: [0], price: { min: 1000, max: 5000 }, area: { min: 60 } };
    const params = new URLSearchParams(Object.entries(filterToParams({ ...filter, status: [...filter.status] })).filter((e): e is [string, string] => e[1] !== null));
    expect(params.toString()).toBe("status=available%2Csold&type=Villa&beds=2%2C3&floors=0&price_min=1000&price_max=5000&area_min=60");
    expect(parseFilter(params)).toEqual(filter);
  });

  it("ignores unknown statuses, bad numbers and empty values", () => {
    expect(parseFilter("?status=gone,sold&beds=x,2&price_min=abc&area_max=&type=")).toEqual({ status: ["sold"], bedrooms: [2] });
    expect(parseFilter("")).toEqual({});
  });

  it("removes every parameter for an empty filter", () => {
    expect(Object.values(filterToParams({})).every((v) => v === null)).toBe(true);
  });
});

describe("FilteredUnitsTable", () => {
  it("shows every unit with no filter, and the clear button disabled", () => {
    render(<FilteredUnitsTable rows={rows} currency="EGP" locale="en" />);
    expect(shown()).toEqual(["F-01", "F-02", "G-01", "G-02", "R-01"]);
    expect(within(bar()).getByText("5 of 5 units")).toBeTruthy();
    expect((within(bar()).getByRole("button", { name: "Clear filters" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("filters by status and writes it to the URL", () => {
    render(<FilteredUnitsTable rows={rows} currency="EGP" locale="en" />);
    fireEvent.click(within(group("Status")).getByRole("checkbox", { name: "Available" }));
    expect(shown()).toEqual(["F-02", "G-01", "R-01"]);
    expect(query().get("status")).toBe("available");
    fireEvent.click(within(group("Status")).getByRole("checkbox", { name: "Sold" }));
    expect(query().get("status")).toBe("available,sold");
    expect(shown()).toEqual(["F-02", "G-01", "G-02", "R-01"]);
  });

  it("filters by type, bedrooms and floor from the values in the data", () => {
    render(<FilteredUnitsTable rows={rows} currency="EGP" locale="en" />);
    expect(within(group("Type")).getAllByRole("checkbox").map((c) => c.parentElement?.textContent)).toEqual(["Annex", "Apartment", "Villa"]);
    fireEvent.click(within(group("Type")).getByRole("checkbox", { name: "Villa" }));
    expect(shown()).toEqual(["G-01", "G-02"]);
    fireEvent.click(within(group("Type")).getByRole("checkbox", { name: "Villa" }));
    fireEvent.click(within(group("Bedrooms")).getByRole("checkbox", { name: "2" }));
    expect(shown()).toEqual(["F-01", "F-02"]);
    expect(query().get("type")).toBeNull();
    expect(query().get("beds")).toBe("2");
    fireEvent.click(within(group("Bedrooms")).getByRole("checkbox", { name: "2" }));
    fireEvent.click(within(group("Floor")).getByRole("checkbox", { name: "2" }));
    expect(shown()).toEqual(["R-01"]);
    expect(query().get("floors")).toBe("2");
  });

  it("filters by price and area ranges", () => {
    render(<FilteredUnitsTable rows={rows} currency="EGP" locale="en" />);
    fireEvent.change(within(group("Price")).getByLabelText("Price Min"), { target: { value: "3600000" } });
    fireEvent.change(within(group("Price")).getByLabelText("Price Max"), { target: { value: "4000000" } });
    expect(shown()).toEqual(["F-01", "F-02", "G-01"]);
    expect(query().get("price_min")).toBe("3600000");
    fireEvent.change(within(group("Area")).getByLabelText("Area (m²) Min"), { target: { value: "105" } });
    expect(shown()).toEqual(["F-01", "G-01"]);
    fireEvent.change(within(group("Price")).getByLabelText("Price Max"), { target: { value: "" } });
    expect(query().get("price_max")).toBeNull();
    expect(shown()).toEqual(["F-01", "G-01", "G-02"]);
  });

  it("restores the filter from a shared link and clears it", () => {
    window.history.replaceState(null, "", "/p/demo/units?status=available&beds=3&lang=en");
    render(<FilteredUnitsTable rows={rows} currency="EGP" locale="en" />);
    expect(shown()).toEqual(["G-01"]);
    expect((within(group("Status")).getByRole("checkbox", { name: "Available" }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(within(bar()).getByRole("button", { name: "Clear filters" }));
    expect(shown()).toHaveLength(5);
    expect(window.location.search).toBe("?lang=en");
  });

  it("says so when nothing matches", () => {
    window.history.replaceState(null, "", "/p/demo/units?status=sold&beds=1");
    render(<FilteredUnitsTable rows={rows} currency="EGP" locale="en" />);
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("No units match these filters.");
    expect(within(bar()).getByText("0 of 5 units")).toBeTruthy();
  });

  it("follows the URL when it changes elsewhere, in Arabic", () => {
    render(<FilteredUnitsTable rows={rows} currency="EGP" locale="ar" />);
    expect(screen.getByRole("search", { name: "تصفية الوحدات" })).toBeTruthy();
    act(() => {
      window.history.pushState(null, "", "/p/demo/units?floors=1");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(shown()).toEqual(["F-01", "F-02"]);
    expect(screen.getByText("٢ من ٥ وحدة")).toBeTruthy();
  });
});
