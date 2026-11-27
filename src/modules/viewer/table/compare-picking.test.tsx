import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));
import { FilteredUnitsTable, SidePanel, type UnitSummary, type UnitTableRow } from "../index";

const row = (code: string): UnitTableRow => ({ code, floor: 0, type: "Villa", bedrooms: 3, bathrooms: 2, areaM2: 150, price: 4000000, status: "available", href: `/p/demo/s?unit=${code}` });
const rows = ["G-01", "G-02", "F-01", "F-02"].map(row);
const box = (code: string, lang: "en" | "ar" = "en") => screen.getByRole("checkbox", { name: lang === "en" ? `Compare unit ${code}` : `قارن الوحدة ${code}` }) as HTMLInputElement;

beforeEach(() => {
  window.history.replaceState(null, "", "/p/demo/units");
});

describe("picking units to compare in the units table", () => {
  it("has no checkboxes without a compare page", () => {
    render(<FilteredUnitsTable rows={rows} currency="EGP" locale="en" />);
    expect(screen.queryAllByRole("checkbox", { name: /Compare unit/ })).toHaveLength(0);
  });

  it("asks for two units, then links to the compare page with the picked units", () => {
    render(<FilteredUnitsTable rows={rows} currency="EGP" locale="en" compareBase="/p/demo/compare?lang=en" />);
    expect(screen.getByText("Pick two or three units to compare.")).toBeTruthy();
    act(() => fireEvent.click(box("G-02")));
    act(() => fireEvent.click(box("F-01")));
    expect(window.location.search).toBe("?compare=G-02%2CF-01");
    expect(screen.getByRole("link", { name: "Compare (2)" }).getAttribute("href")).toBe("/p/demo/compare?lang=en&units=G-02,F-01");
  });

  it("disables the other boxes once three are picked, and unpicking frees them", () => {
    window.history.replaceState(null, "", "/p/demo/units?compare=G-01,G-02,F-01");
    render(<FilteredUnitsTable rows={rows} currency="EGP" locale="ar" compareBase="/p/demo/compare" />);
    expect(box("F-02", "ar").disabled).toBe(true);
    expect(box("G-01", "ar").checked).toBe(true);
    expect(screen.getByRole("link", { name: "قارن (٣)" })).toBeTruthy();
    act(() => fireEvent.click(box("G-01", "ar")));
    expect(box("F-02", "ar").disabled).toBe(false);
  });
});

describe("compare link in the unit panel", () => {
  const units: Record<string, UnitSummary> = { "G-01": { code: "G-01", type: "Villa", floor: 0, bedrooms: 3, bathrooms: 2, areaM2: 150, price: 4000000, status: "available" } };

  it("opens the units list with this unit picked, in the page language", () => {
    window.history.replaceState(null, "", "/p/demo/ground?unit=G-01&lang=en");
    render(<SidePanel sceneTitle="Ground" units={units} currency="EGP" locale="en" unitsHref="/p/demo/units?lang=en" />);
    expect(screen.getByRole("link", { name: "Compare with other units" }).getAttribute("href")).toBe("/p/demo/units?lang=en&compare=G-01");
  });

  it("is absent without a units page", () => {
    window.history.replaceState(null, "", "/p/demo/ground?unit=G-01");
    render(<SidePanel sceneTitle="Ground" units={units} currency="EGP" locale="ar" />);
    expect(screen.queryByRole("link", { name: "قارن بوحدات أخرى" })).toBeNull();
  });
});
