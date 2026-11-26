// Filters applied from the scene view, on data shaped like the demo villa:
// a facade with three floor bands, and the ground floor with its two units.
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));

import type { Scene } from "@/modules/schema";
import { SceneFilter, SceneStage, type SceneStageProps, type UnitSummary } from "../index";

const unit = (code: string, floor: number, bedrooms: number, price: number, status: UnitSummary["status"]): UnitSummary => ({
  code,
  type: floor === 2 ? "Annex" : "Apartment",
  floor,
  bedrooms,
  bathrooms: 1,
  areaM2: 100,
  price,
  status,
});
const villa = {
  ground: [unit("G-01", 0, 3, 3950000, "available"), unit("G-02", 0, 3, 4050000, "reserved")],
  first: [unit("F-01", 1, 2, 3600000, "sold"), unit("F-02", 1, 2, 3650000, "available")],
  roof: [unit("R-01", 2, 1, 2200000, "sold")],
};
const all = [...villa.ground, ...villa.first, ...villa.roof];
const band = (y: number): [number, number][] => [[0, y], [800, y], [800, y + 100], [0, y + 100]];

const facade: Scene = {
  id: "facade",
  kind: "facade",
  type: "image-2d",
  title: { ar: "الواجهة", en: "Facade" },
  image: { path: "images/facade.svg", width: 800, height: 400 },
  hotspots: [
    { id: "roof", points: band(0), target: { scene: "roof" } },
    { id: "first", points: band(100), target: { scene: "first" } },
    { id: "ground", points: band(200), target: { scene: "ground" } },
  ],
  children: [],
};
const ground: Scene = {
  ...facade,
  id: "ground",
  kind: "floor",
  hotspots: [
    { id: "g-01", points: [[0, 0], [400, 0], [400, 400], [0, 400]], target: { unit: "G-01" } },
    { id: "g-02", points: [[400, 0], [800, 0], [800, 400], [400, 400]], target: { unit: "G-02" } },
  ],
};

const stage = (scene: Scene, locale: "ar" | "en" = "en"): SceneStageProps => ({
  scene,
  imageUrl: "/x.svg",
  units: Object.fromEntries(all.map((u) => [u.code, u])),
  sceneTitles: { roof: "Roof", first: "First floor", ground: "Ground floor" },
  sceneSummaries: {},
  sceneUnits: villa,
  sceneHrefs: {},
  currency: "EGP",
  locale,
});

const hotspot = (name: string) => screen.getByRole("button", { name: new RegExp(`^${name}`) });
const badge = (id: string) => document.querySelector(`[data-badge="${id}"]`)?.textContent ?? null;
const setUrl = (search: string) =>
  act(() => {
    window.history.pushState(null, "", `/p/demo-villa${search}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  });

beforeEach(() => {
  window.history.replaceState(null, "", "/p/demo-villa");
});

describe("filter highlight on the scene", () => {
  it("draws nothing extra without a filter", () => {
    render(<SceneStage {...stage(facade)} />);
    expect(hotspot("Ground floor").getAttribute("data-emphasis")).toBeNull();
    expect(document.querySelectorAll("[data-badge]")).toHaveLength(0);
  });

  it("shows on each floor band how many matching units lie below it, dimming floors with none", () => {
    render(<SceneStage {...stage(facade)} />);
    setUrl("?status=available");
    expect([badge("roof"), badge("first"), badge("ground")]).toEqual(["0", "1", "1"]);
    expect(hotspot("Roof").getAttribute("data-emphasis")).toBe("dim");
    expect(hotspot("First floor").getAttribute("data-emphasis")).toBe("match");
    expect(hotspot("Ground floor").style.fillOpacity).toBe("0.35");
    expect(hotspot("Roof").style.fill).toBe("#000000");
    setUrl("?beds=3");
    expect([badge("roof"), badge("first"), badge("ground")]).toEqual(["0", "0", "2"]);
  });

  it("keeps matching unit hotspots coloured and dims the others", () => {
    render(<SceneStage {...stage(ground)} />);
    setUrl("?price_max=4000000");
    expect(hotspot("Unit G-01").getAttribute("data-emphasis")).toBe("match");
    expect(hotspot("Unit G-02").getAttribute("data-emphasis")).toBe("dim");
    expect(document.querySelectorAll("[data-badge]")).toHaveLength(0);
    fireEvent.mouseEnter(hotspot("Unit G-02"));
    expect(hotspot("Unit G-02").getAttribute("data-active")).toBe("true");
    expect(hotspot("Unit G-02").style.fill).not.toBe("#000000");
  });

  it("uses Arabic digits on the badges in Arabic", () => {
    render(<SceneStage {...stage(facade, "ar")} />);
    setUrl("?floors=0,1");
    expect([badge("roof"), badge("first"), badge("ground")]).toEqual(["٠", "٢", "٢"]);
  });
});

describe("SceneFilter", () => {
  it("opens the filter form, applies it to the stage through the URL, and clears it", () => {
    render(
      <>
        <SceneFilter units={all} locale="en" />
        <SceneStage {...stage(facade)} />
      </>,
    );
    const toggle = screen.getByRole("button", { name: "Filter" });
    expect(screen.queryByRole("search")).toBeNull();
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    const form = screen.getByRole("search", { name: "Filter units" });
    fireEvent.click(within(form).getByRole("checkbox", { name: "Sold" }));
    expect(window.location.search).toBe("?status=sold");
    expect(within(form).getByText("2 of 5 units")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Filter (on)" })).toBeTruthy();
    expect([badge("roof"), badge("first"), badge("ground")]).toEqual(["1", "1", "0"]);
    fireEvent.click(within(form).getByRole("button", { name: "Clear filters" }));
    expect(window.location.search).toBe("");
    expect(document.querySelectorAll("[data-badge]")).toHaveLength(0);
  });
});
