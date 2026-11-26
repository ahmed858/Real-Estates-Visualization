import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));

import type { SceneStats } from "@/modules/domain";
import type { Scene } from "@/modules/schema";
import { SceneStage, SidePanel, formatPrice, selectUnit, type UnitSummary } from "../index";

const g01: UnitSummary = { code: "G-01", type: "Apartment", floor: 0, bedrooms: 3, bathrooms: 2, areaM2: 145, price: 2500000, status: "available", planImageUrl: "/files/demo/images/type-a.svg", notes: "Private garden" };
const g02: UnitSummary = { code: "G-02", type: "Apartment", floor: 0, bedrooms: 2, bathrooms: 1, areaM2: 110, price: 1800000, status: "sold" };
const units = { "G-01": g01, "G-02": g02 };
const stats: SceneStats = { total: 2, byStatus: { available: 1, reserved: 0, sold: 1 }, price: { min: 1800000, max: 2500000 }, area: { min: 110, max: 145 } };

const scene: Scene = {
  id: "ground",
  kind: "floor",
  type: "image-2d",
  title: { ar: "الأرضي", en: "Ground floor" },
  image: { path: "images/ground.svg", width: 400, height: 300 },
  hotspots: [
    { id: "g-01", points: [[0, 0], [200, 0], [200, 300], [0, 300]], target: { unit: "G-01" } },
    { id: "g-02", points: [[200, 0], [400, 0], [400, 300], [200, 300]], target: { unit: "G-02" } },
  ],
  children: [],
};

const Viewer = () => (
  <>
    <SceneStage scene={scene} imageUrl="/g.svg" units={units} sceneTitles={{ ground: "Ground floor" }} sceneCounts={{}} sceneHrefs={{}} currency="EGP" locale="en" />
    <SidePanel sceneTitle="Ground floor" stats={stats} units={units} currency="EGP" locale="en" />
  </>
);

const rows = (region: HTMLElement) => Object.fromEntries(within(region).getAllByRole("term").map((dt) => [dt.textContent, dt.nextElementSibling?.textContent]));

beforeEach(() => {
  window.history.replaceState(null, "", "/p/demo/ground");
});

describe("SidePanel", () => {
  it("shows the scene summary when nothing is selected", () => {
    render(<SidePanel sceneTitle="Ground floor" stats={stats} units={units} currency="EGP" locale="en" />);
    const panel = screen.getByRole("region", { name: "Details" });
    expect(within(panel).getByRole("heading", { name: "Ground floor" })).toBeTruthy();
    expect(rows(panel)).toMatchObject({
      Units: "2",
      Available: "1",
      Reserved: "0",
      Sold: "1",
      Prices: `${formatPrice(1800000, "EGP", "en")} – ${formatPrice(2500000, "EGP", "en")}`,
      Areas: "110 – 145 m²",
    });
  });

  it("shows the unit from ?unit= with its plan image and notes", () => {
    window.history.replaceState(null, "", "/p/demo/ground?unit=G-01");
    render(<SidePanel sceneTitle="Ground floor" stats={stats} units={units} currency="EGP" locale="en" />);
    const panel = screen.getByRole("region", { name: "Unit G-01" });
    expect(rows(panel)).toEqual({
      Status: "Available",
      Type: "Apartment",
      Floor: "0",
      Bedrooms: "3",
      Bathrooms: "2",
      Area: "145 m²",
      Price: formatPrice(2500000, "EGP", "en"),
    });
    expect(within(panel).getByRole("img", { name: "Plan of unit G-01" }).getAttribute("src")).toBe("/files/demo/images/type-a.svg");
    expect(within(panel).getByText("Private garden")).toBeTruthy();
  });

  it("has no plan image when the sheet names none", () => {
    window.history.replaceState(null, "", "/p/demo/ground?unit=G-02");
    render(<SidePanel sceneTitle="Ground floor" stats={stats} units={units} currency="EGP" locale="en" />);
    expect(within(screen.getByRole("region", { name: "Unit G-02" })).queryByRole("img")).toBeNull();
  });

  it("falls back to the summary for an unknown unit code", () => {
    window.history.replaceState(null, "", "/p/demo/ground?unit=Z-99");
    render(<SidePanel sceneTitle="Ground floor" stats={stats} units={units} currency="EGP" locale="en" />);
    expect(screen.getByRole("region", { name: "Details" })).toBeTruthy();
  });
});

describe("selecting a unit", () => {
  it("clicking a unit puts it in the URL and opens it in the panel; closing clears both", () => {
    window.history.replaceState(null, "", "/p/demo/ground?lang=x");
    render(<Viewer />);
    fireEvent.click(screen.getByRole("button", { name: "Unit G-02, Sold" }));
    expect(window.location.search).toBe("?lang=x&unit=G-02");
    const panel = screen.getByRole("region", { name: "Unit G-02" });
    fireEvent.click(within(panel).getByRole("button", { name: "Close" }));
    expect(window.location.search).toBe("?lang=x");
    expect(screen.getByRole("region", { name: "Details" })).toBeTruthy();
  });

  it("follows the URL when it changes elsewhere (e.g. back button)", () => {
    render(<Viewer />);
    act(() => selectUnit("G-01"));
    expect(screen.getByRole("region", { name: "Unit G-01" })).toBeTruthy();
    act(() => {
      window.history.replaceState(null, "", "/p/demo/ground");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(screen.getByRole("region", { name: "Details" })).toBeTruthy();
  });
});
