import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));

import type { Scene } from "@/modules/schema";
import { HoverCard, SceneStage, formatPrice, viewerText, type SceneStageProps } from "../index";

const en = viewerText("en");
const unit = { code: "G-01", type: "Apartment", floor: 0, bedrooms: 3, bathrooms: 2, areaM2: 145, price: 2500000, status: "available" } as const;

const scene: Scene = {
  id: "facade",
  kind: "facade",
  type: "image-2d",
  title: { ar: "الواجهة", en: "Facade" },
  image: { path: "images/facade.svg", width: 800, height: 600 },
  hotspots: [
    { id: "ground", points: [[100, 300], [700, 300], [700, 500], [100, 500]], target: { scene: "ground" } },
    { id: "g-01", points: [[0, 0], [200, 0], [200, 100], [0, 100]], target: { unit: "G-01" } },
    { id: "x-99", points: [[0, 0], [10, 0], [10, 10]], target: { unit: "X-99" } },
  ],
  children: [],
};

const props = (locale: "ar" | "en" = "en"): SceneStageProps => ({
  scene,
  imageUrl: "/files/demo/images/facade.svg",
  units: { "G-01": unit },
  sceneTitles: { facade: "Facade", ground: "Ground floor" },
  sceneFigures: {
    ground: {
      total: 2,
      byStatus: { available: 1, reserved: 1, sold: 0 },
      bedroomMix: [{ bedrooms: 3, units: 2 }],
      price: { min: 2000000, max: 2500000 },
      area: { min: 120, max: 145 },
    },
  },
  sceneHrefs: { ground: "/p/demo/ground" },
  currency: "EGP",
  locale,
});

const cardRows = (card: HTMLElement) =>
  within(card)
    .getAllByRole("term")
    .map((dt) => [dt.textContent, dt.nextElementSibling?.textContent]);

const figures = {
  total: 8,
  byStatus: { available: 5, reserved: 2, sold: 1 },
  bedroomMix: [
    { bedrooms: 2, units: 6 },
    { bedrooms: 3, units: 2 },
  ],
  price: { min: 1800000, max: 2600000 },
  area: { min: 110, max: 145 },
} as const;

const chips = (card: HTMLElement) =>
  [...card.querySelectorAll("[data-count]")].map((li) => [li.getAttribute("data-count"), li.textContent]);

describe("HoverCard", () => {
  it("shows a unit's code, status chip, type, bedrooms, area and price in the project currency", () => {
    render(<HoverCard content={{ kind: "unit", unit }} text={en} locale="en" currency="EGP" />);
    const card = screen.getByRole("tooltip");
    expect(within(card).getByText("Unit G-01")).toBeTruthy();
    expect(chips(card)).toEqual([["available", "Available"]]);
    expect(cardRows(card)).toEqual([
      ["Type", "Apartment"],
      ["Bedrooms", "3"],
      ["Area", "145 m²"],
      ["Price", formatPrice(2500000, "EGP", "en")],
    ]);
    expect(formatPrice(2500000, "EGP", "en")).toMatch(/EGP\s?2,500,000/);
    expect(within(card).getByText(en.card.detailsHint)).toBeTruthy();
  });

  it("shows the floor card: title, unit count, status chips, bedroom mix, area and price ranges and a hint", () => {
    render(<HoverCard content={{ kind: "scene", title: "Ground floor", figures }} text={en} locale="en" currency="EGP" />);
    const card = screen.getByRole("tooltip");
    expect(within(card).getByText("Ground floor")).toBeTruthy();
    expect(within(card).getByText("8 units")).toBeTruthy();
    expect(chips(card)).toEqual([
      ["available", "Available5"],
      ["reserved", "Reserved2"],
      ["sold", "Sold1"],
    ]);
    expect(within(screen.getByTestId("bedroom-mix")).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "2 bedrooms · 6 units",
      "3 bedrooms · 2 units",
    ]);
    expect(cardRows(card)).toEqual([
      ["Area", "110 – 145 m²"],
      ["Price", `${formatPrice(1800000, "EGP", "en")} – ${formatPrice(2600000, "EGP", "en")}`],
    ]);
    expect(within(card).getByText("Click to view units")).toBeTruthy();
  });

  it("shows a single value instead of a range and a singular unit count", () => {
    const one = { total: 1, byStatus: { available: 1, reserved: 0, sold: 0 }, bedroomMix: [{ bedrooms: 1, units: 1 }], price: { min: 900000, max: 900000 }, area: { min: 80, max: 80 } };
    render(<HoverCard content={{ kind: "scene", title: "Roof", figures: one }} text={en} locale="en" currency="EGP" />);
    const card = screen.getByRole("tooltip");
    expect(within(card).getByText("1 unit")).toBeTruthy();
    expect(within(card).getByText("1 bedrooms · 1 unit")).toBeTruthy();
    expect(cardRows(card)).toEqual([
      ["Area", "80 m²"],
      ["Price", formatPrice(900000, "EGP", "en")],
    ]);
  });

  it("shows only the title and hint for a scene without figures", () => {
    render(<HoverCard content={{ kind: "scene", title: "Garden" }} text={en} locale="en" currency="EGP" />);
    const card = screen.getByRole("tooltip");
    expect(card.querySelectorAll("[data-count]")).toHaveLength(0);
    expect(within(card).getByText("Click to view units")).toBeTruthy();
  });

  it("uses Arabic labels and digits for the floor card in Arabic", () => {
    const ar = viewerText("ar");
    render(<HoverCard content={{ kind: "scene", title: "الدور الأرضي", figures }} text={ar} locale="ar" currency="EGP" />);
    const card = screen.getByRole("tooltip");
    expect(within(card).getByText("٨ وحدة")).toBeTruthy();
    expect(chips(card)).toEqual([
      ["available", "متاح٥"],
      ["reserved", "محجوز٢"],
      ["sold", "مباع١"],
    ]);
    expect(within(screen.getByTestId("bedroom-mix")).getAllByRole("listitem")[0].textContent).toBe("٢ غرف نوم · ٦ وحدة");
    expect(within(card).getByText(ar.card.openHint)).toBeTruthy();
  });

  it("uses Arabic labels and digits for a unit card in Arabic", () => {
    render(<HoverCard content={{ kind: "unit", unit }} text={viewerText("ar")} locale="ar" currency="EGP" />);
    const card = screen.getByRole("tooltip");
    expect(within(card).getByText("النوع")).toBeTruthy();
    expect(within(card).getByText("متاح")).toBeTruthy();
    expect(within(card).getByText("٣")).toBeTruthy();
  });
});

describe("SceneStage hover card", () => {
  it("appears on hover over a unit hotspot and goes away on leave", () => {
    render(<SceneStage {...props()} />);
    expect(screen.queryByRole("tooltip")).toBeNull();
    const hotspot = screen.getByRole("button", { name: "Unit G-01, Available" });
    fireEvent.mouseEnter(hotspot);
    expect(within(screen.getByRole("tooltip")).getByText("Unit G-01")).toBeTruthy();
    fireEvent.mouseLeave(hotspot);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("appears on keyboard focus of a scene hotspot, above the hotspot", () => {
    render(<SceneStage {...props()} />);
    const hotspot = screen.getByRole("button", { name: "Ground floor" });
    fireEvent.focus(hotspot);
    const card = screen.getByRole("tooltip");
    expect(within(card).getByText("Ground floor")).toBeTruthy();
    expect(within(card).getByText("2 units")).toBeTruthy();
    expect(within(screen.getByTestId("bedroom-mix")).getByText("3 bedrooms · 2 units")).toBeTruthy();
    const anchor = screen.getByTestId("hover-card");
    expect(anchor.style.left).toBe("50%");
    expect(anchor.style.top).toBe("50%");
    expect(anchor.getAttribute("data-placement")).toBe("above");
    fireEvent.blur(hotspot);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("hangs the card below the anchor for a hotspot near the top of the image", () => {
    render(<SceneStage {...props()} />);
    fireEvent.mouseEnter(screen.getByRole("button", { name: "Unit G-01, Available" }));
    const anchor = screen.getByTestId("hover-card");
    expect(anchor.style.top).toBe("0%");
    expect(anchor.getAttribute("data-placement")).toBe("below");
  });

  it("shows no card for a unit missing from the sheet", () => {
    render(<SceneStage {...props()} />);
    fireEvent.mouseEnter(screen.getByRole("button", { name: "Unit X-99" }));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});

describe("SceneStage hotspots", () => {
  const look = (el: HTMLElement) => [el.style.fillOpacity, el.style.strokeOpacity];

  it.each(["en", "ar"] as const)("are invisible until hover or focus (%s)", (locale) => {
    render(<SceneStage {...props(locale)} />);
    const name = locale === "en" ? "Unit G-01, Available" : "وحدة G-01, متاح";
    const hotspot = screen.getByRole("button", { name });
    const other = screen.getByRole("button", { name: "Ground floor" });
    expect(look(hotspot)).toEqual(["0", "0"]);
    expect(look(other)).toEqual(["0", "0"]);
    fireEvent.mouseEnter(hotspot);
    expect(hotspot.getAttribute("data-active")).toBe("true");
    expect(look(hotspot)).toEqual(["0.28", "1"]);
    expect(hotspot.style.filter).toContain("drop-shadow");
    expect(look(other)).toEqual(["0", "0"]);
    fireEvent.mouseLeave(hotspot);
    expect(look(hotspot)).toEqual(["0", "0"]);
    fireEvent.focus(other);
    expect(look(other)).toEqual(["0.28", "1"]);
  });

  it("paints scene hotspots in the brand accent and unit hotspots in their status colour", () => {
    render(<SceneStage {...props()} />);
    const floor = screen.getByRole("button", { name: "Ground floor" });
    const unitHotspot = screen.getByRole("button", { name: "Unit G-01, Available" });
    expect(floor.style.fill).toContain("--brand-accent");
    expect(unitHotspot.style.fill).not.toContain("--brand-accent");
    expect(unitHotspot.getAttribute("fill")).toBe(unitHotspot.getAttribute("stroke"));
  });
});
