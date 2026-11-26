import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));

import type { Scene } from "@/modules/schema";
import { HoverCard, SceneStage, formatPrice, viewerText, type SceneStageProps } from "../index";

const en = viewerText("en");
const unit = { code: "G-01", type: "Apartment", floor: 0, bedrooms: 3, bathrooms: 2, areaM2: 145, price: 2500000, status: "available" } as const;

const groundSummary = {
  total: 8,
  byStatus: { available: 5, reserved: 2, sold: 1 },
  bedroomMix: [
    { bedrooms: 2, units: 6 },
    { bedrooms: 3, units: 2 },
  ],
  price: { min: 2_000_000, max: 3_500_000 },
  area: { min: 110, max: 160 },
};

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
  sceneSummaries: { ground: groundSummary },
  sceneHrefs: { ground: "/p/demo/ground" },
  currency: "EGP",
  locale,
});

const cardRows = (card: HTMLElement) =>
  within(card)
    .getAllByRole("term")
    .map((dt) => [dt.textContent, dt.nextElementSibling?.textContent]);

describe("HoverCard", () => {
  it("shows a unit's code, status chip, type, bedrooms, area and price in the project currency", () => {
    render(<HoverCard content={{ kind: "unit", unit }} text={en} locale="en" currency="EGP" />);
    const card = screen.getByRole("tooltip");
    expect(within(card).getByText("Unit G-01")).toBeTruthy();
    expect(card.querySelector('[data-chip="available"]')?.textContent).toBe("Available");
    expect(cardRows(card)).toEqual([
      ["Type", "Apartment"],
      ["Bedrooms", "3"],
      ["Area", "145 m²"],
      ["Price", formatPrice(2500000, "EGP", "en")],
    ]);
    expect(formatPrice(2500000, "EGP", "en")).toMatch(/EGP\s?2,500,000/);
  });

  it("shows the floor card: title, unit count, status chips, bedroom mix, ranges and a hint", () => {
    render(<HoverCard content={{ kind: "scene", title: "Ground floor", summary: groundSummary }} text={en} locale="en" currency="EGP" />);
    const card = screen.getByRole("tooltip");
    expect(within(card).getByText("Ground floor")).toBeTruthy();
    expect(screen.getByTestId("card-total").textContent).toBe("8 units");
    const chips = within(card).getByRole("list", { name: "Unit status" });
    expect(within(chips).getAllByRole("listitem").map((li) => [li.getAttribute("data-chip"), li.textContent])).toEqual([
      ["available", "Available5"],
      ["reserved", "Reserved2"],
      ["sold", "Sold1"],
    ]);
    const mix = within(card).getByRole("list", { name: "Bedroom mix" });
    expect(within(mix).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["2 bedrooms · 6 units", "3 bedrooms · 2 units"]);
    expect(cardRows(card)).toEqual([
      ["Areas", "110 m² – 160 m²"],
      ["Prices", `${formatPrice(2_000_000, "EGP", "en")} – ${formatPrice(3_500_000, "EGP", "en")}`],
    ]);
    expect(within(card).getByText("Click to view units")).toBeTruthy();
  });

  it("shows a single value when a range has one end, and no mix or ranges for an empty scene", () => {
    const one = { ...groundSummary, total: 1, byStatus: { available: 1, reserved: 0, sold: 0 }, bedroomMix: [{ bedrooms: 1, units: 1 }], price: { min: 5, max: 5 }, area: { min: 90, max: 90 } };
    const { unmount } = render(<HoverCard content={{ kind: "scene", title: "Roof", summary: one }} text={en} locale="en" currency="EGP" />);
    expect(screen.getByTestId("card-total").textContent).toBe("1 unit");
    expect(within(screen.getByTestId("bedroom-mix")).getByText("1 bedroom · 1 unit")).toBeTruthy();
    expect(cardRows(screen.getByRole("tooltip"))[0]).toEqual(["Areas", "90 m²"]);
    unmount();
    const empty = { total: 0, byStatus: { available: 0, reserved: 0, sold: 0 }, bedroomMix: [], price: null, area: null };
    render(<HoverCard content={{ kind: "scene", title: "Empty", summary: empty }} text={en} locale="en" currency="EGP" />);
    expect(screen.queryByTestId("bedroom-mix")).toBeNull();
    expect(within(screen.getByRole("tooltip")).queryAllByRole("term")).toEqual([]);
  });

  it("uses Arabic labels, plurals and digits for an Arabic project", () => {
    render(<HoverCard content={{ kind: "unit", unit }} text={viewerText("ar")} locale="ar" currency="EGP" />);
    const card = screen.getByRole("tooltip");
    expect(within(card).getByText("النوع")).toBeTruthy();
    expect(within(card).getByText("متاح")).toBeTruthy();
    expect(within(card).getByText("٣")).toBeTruthy();
  });

  it("shows the floor card in Arabic", () => {
    const summary = { ...groundSummary, bedroomMix: [{ bedrooms: 0, units: 1 }, ...groundSummary.bedroomMix] };
    render(<HoverCard content={{ kind: "scene", title: "الدور الأرضي", summary }} text={viewerText("ar")} locale="ar" currency="EGP" />);
    expect(screen.getByTestId("card-total").textContent).toBe("٨ وحدات");
    const mix = within(screen.getByTestId("bedroom-mix")).getAllByRole("listitem").map((li) => li.textContent);
    expect(mix).toEqual(["استوديو · ١ وحدة", "٢ غرفة نوم · ٦ وحدات", "٣ غرف نوم · ٢ وحدة"]);
    expect(screen.getByText("اضغط لعرض الوحدات")).toBeTruthy();
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
    const anchor = screen.getByTestId("hover-card");
    expect(anchor.style.left).toBe("50%");
    expect(anchor.style.top).toBe("50%");
    fireEvent.blur(hotspot);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("shows the floor card with the scene's summary on a scene hotspot", () => {
    render(<SceneStage {...props()} />);
    fireEvent.mouseEnter(screen.getByRole("button", { name: "Ground floor" }));
    expect(screen.getByTestId("card-total").textContent).toBe("8 units");
    expect(screen.getByTestId("bedroom-mix")).toBeTruthy();
  });

  it("shows no card for a unit missing from the sheet", () => {
    render(<SceneStage {...props()} />);
    fireEvent.mouseEnter(screen.getByRole("button", { name: "Unit X-99" }));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});
