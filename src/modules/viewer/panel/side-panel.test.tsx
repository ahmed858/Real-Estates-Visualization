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
    <SceneStage scene={scene} imageUrl="/g.svg" units={units} sceneTitles={{ ground: "Ground floor" }} sceneSummaries={{}} sceneHrefs={{}} currency="EGP" locale="en" />
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

  it("shows the unit's photos as thumbnails that open the full photo, with numbered names", () => {
    const withPhotos = { ...units, "G-01": { ...g01, galleryUrls: ["/files/demo/images/a.jpg", "/files/demo/images/b.jpg"] } };
    window.history.replaceState(null, "", "/p/demo/ground?unit=G-01");
    render(<SidePanel sceneTitle="Ground floor" stats={stats} units={withPhotos} currency="EGP" locale="ar" />);
    const photos = within(screen.getByRole("list", { name: "الصور" })).getAllByRole("img");
    expect(photos.map((img) => [img.getAttribute("alt"), img.closest("a")?.getAttribute("href")])).toEqual([
      ["صورة ١ من ٢ للوحدة G-01", "/files/demo/images/a.jpg"],
      ["صورة ٢ من ٢ للوحدة G-01", "/files/demo/images/b.jpg"],
    ]);
  });

  it("has no photo list without photos", () => {
    window.history.replaceState(null, "", "/p/demo/ground?unit=G-01");
    render(<SidePanel sceneTitle="Ground floor" stats={stats} units={units} currency="EGP" locale="en" />);
    expect(screen.queryByRole("list", { name: "Photos" })).toBeNull();
  });

  it("has no plan image when the sheet names none", () => {
    window.history.replaceState(null, "", "/p/demo/ground?unit=G-02");
    render(<SidePanel sceneTitle="Ground floor" stats={stats} units={units} currency="EGP" locale="en" />);
    expect(within(screen.getByRole("region", { name: "Unit G-02" })).queryByRole("img")).toBeNull();
  });

  it("links to the unit's 360° tours, named by the tour title", () => {
    const toured = { ...units, "G-01": { ...g01, tours: [{ title: "Living room (360°)", href: "/p/demo/living-360" }] } };
    window.history.replaceState(null, "", "/p/demo/ground?unit=G-01");
    render(<SidePanel sceneTitle="Ground floor" stats={stats} units={toured} currency="EGP" locale="en" />);
    const link = within(screen.getByRole("list", { name: "360° tour" })).getByRole("link", { name: "360° tour: Living room (360°)" });
    expect(link.getAttribute("href")).toBe("/p/demo/living-360");
  });

  it("has no tour list for a unit without tours", () => {
    window.history.replaceState(null, "", "/p/demo/ground?unit=G-02");
    render(<SidePanel sceneTitle="Ground floor" stats={stats} units={units} currency="EGP" locale="ar" />);
    expect(screen.queryByRole("list", { name: "جولة 360°" })).toBeNull();
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

  it("offers a WhatsApp enquiry that names the project and the unit code", () => {
    window.history.replaceState(null, "", "/p/demo/ground?unit=G-01");
    render(<SidePanel sceneTitle="Ground floor" stats={stats} units={units} currency="EGP" locale="en" enquiry={{ whatsapp: "+20 100 123 4567", projectName: "Courtyard Villa" }} />);
    const link = within(screen.getByRole("region", { name: "Unit G-01" })).getByRole("link", { name: "Ask on WhatsApp" });
    const url = new URL(link.getAttribute("href") ?? "");
    expect(url.origin + url.pathname).toBe("https://wa.me/201001234567");
    expect(url.searchParams.get("text")).toBe("Hello, I would like to ask about unit G-01 in Courtyard Villa.");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("names the unit's floor in the enquiry on a typical floor, in Arabic digits for Arabic", () => {
    window.history.replaceState(null, "", "/p/demo/typical?unit=G-02");
    render(<SidePanel sceneTitle="Typical" stats={stats} units={{ "G-02": { ...g02, floor: 12 } }} currency="EGP" locale="ar" enquiry={{ whatsapp: "+201001234567", projectName: "البرج", typicalFloor: true }} />);
    const link = screen.getByRole("link", { name: "استفسر على واتساب" });
    expect(new URL(link.getAttribute("href") ?? "").searchParams.get("text")).toBe("مرحبًا، أريد الاستفسار عن الوحدة G-02 في الدور ١٢ في مشروع البرج.");
  });

  it("shows no enquiry button without contact details or on the scene summary", () => {
    window.history.replaceState(null, "", "/p/demo/ground?unit=G-01");
    const { unmount } = render(<SidePanel sceneTitle="Ground floor" stats={stats} units={units} currency="EGP" locale="en" />);
    expect(screen.queryByTestId("whatsapp-link")).toBeNull();
    unmount();
    window.history.replaceState(null, "", "/p/demo/ground");
    render(<SidePanel sceneTitle="Ground floor" stats={stats} units={units} currency="EGP" locale="en" enquiry={{ whatsapp: "+201001234567", projectName: "X" }} />);
    expect(screen.queryByTestId("whatsapp-link")).toBeNull();
  });
  it("shows the lead form button only for a project with a webhook, and starts fresh for another unit", () => {
    window.history.replaceState(null, "", "/p/demo/ground?unit=G-01");
    const request = "Request a call about this unit";
    const { unmount } = render(<SidePanel sceneTitle="Ground floor" stats={stats} units={units} currency="EGP" locale="en" />);
    expect(screen.queryByRole("button", { name: request })).toBeNull();
    unmount();
    render(<SidePanel sceneTitle="Ground floor" stats={stats} units={units} currency="EGP" locale="en" leadSlug="demo" />);
    fireEvent.click(screen.getByRole("button", { name: request }));
    expect(screen.getByRole("form", { name: "Request a call about unit G-01" })).toBeTruthy();
    act(() => selectUnit("G-02"));
    expect(screen.queryByRole("form")).toBeNull();
    expect(within(screen.getByRole("region", { name: "Unit G-02" })).getByRole("button", { name: request })).toBeTruthy();
  });
});
