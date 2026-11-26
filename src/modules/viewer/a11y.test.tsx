// Accessibility and keyboard pass (U-407): focus order, visible focus on
// hotspots, Escape closes the unit panel, the hover card is announced.
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));

import type { Scene } from "@/modules/schema";
import { ProjectHeader, SceneStage, SidePanel, StatusLegend, ViewerLayout, selectUnit, viewerText, type SceneStageProps, type UnitSummary } from "./index";

const en = viewerText("en");
const g01: UnitSummary = { code: "G-01", type: "Apartment", floor: 0, bedrooms: 3, bathrooms: 2, areaM2: 145, price: 2500000, status: "available" };
const scene: Scene = {
  id: "facade",
  kind: "facade",
  type: "image-2d",
  title: { ar: "الواجهة", en: "Facade" },
  image: { path: "images/facade.svg", width: 800, height: 600 },
  hotspots: [
    { id: "ground", points: [[0, 300], [800, 300], [800, 600], [0, 600]], target: { scene: "ground" } },
    { id: "g-01", points: [[0, 0], [400, 0], [400, 200], [0, 200]], target: { unit: "G-01" } },
  ],
  children: [],
};
const stage = (locale: "ar" | "en" = "en"): SceneStageProps => ({
  scene,
  imageUrl: "/x.svg",
  units: { "G-01": g01 },
  sceneTitles: { ground: locale === "en" ? "Ground floor" : "الدور الأرضي" },
  sceneSummaries: { ground: { total: 2, byStatus: { available: 1, reserved: 1, sold: 0 }, bedroomMix: [], price: null, area: null } },
  sceneHrefs: { ground: "/p/demo/ground" },
  currency: "EGP",
  locale,
});

const Viewer = () => (
  <ViewerLayout
    locale="en"
    brand={{ primary: "#1a6b4f", accent: "#c89b3c" }}
    header={<ProjectHeader name="Courtyard Villa" logoUrl="/logo.svg" text={en} actions={<button type="button">العربية</button>} />}
    nav={<a href="/p/demo">Facade</a>}
    scene={<SceneStage {...stage()} />}
    legend={<StatusLegend text={en} />}
    panel={<SidePanel sceneTitle="Facade" units={{ "G-01": g01 }} currency="EGP" locale="en" />}
  />
);

const tabbable = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('a[href], button, [tabindex="0"]')].filter((el) => !el.hasAttribute("disabled"));

beforeEach(() => {
  window.history.replaceState(null, "", "/p/demo");
});

describe("keyboard and screen reader access", () => {
  it("orders focus header → nav → scene hotspots → panel", () => {
    const { container } = render(<Viewer />);
    const names = tabbable(container).map((el) => el.getAttribute("aria-label") ?? el.textContent);
    const at = (name: string) => names.indexOf(name);
    expect(at("العربية")).toBeLessThan(at("Facade"));
    expect(at("Facade")).toBeLessThan(at("Ground floor"));
    expect(at("Ground floor")).toBeLessThan(at("Unit G-01, Available"));
    // The panel comes last: open a unit so its Close button is tabbable.
    act(() => selectUnit("G-01"));
    const after = tabbable(container).map((el) => el.textContent);
    expect(after.at(-1)).toBe(en.panel.close);
  });

  it("shows focus on a hotspot with the same glow as hover", () => {
    render(<SceneStage {...stage()} />);
    const hotspot = screen.getByRole("button", { name: "Unit G-01, Available" });
    expect(hotspot.getAttribute("tabindex")).toBe("0");
    fireEvent.focus(hotspot);
    expect(hotspot.getAttribute("data-active")).toBe("true");
    expect(hotspot.style.strokeOpacity).not.toBe("0");
    fireEvent.blur(hotspot);
    expect(hotspot.getAttribute("data-active")).toBeNull();
  });

  it("closes the unit panel with Escape", () => {
    window.history.replaceState(null, "", "/p/demo?unit=G-01");
    render(<SidePanel sceneTitle="Facade" units={{ "G-01": g01 }} currency="EGP" locale="en" />);
    expect(screen.getByRole("region", { name: "Unit G-01" })).toBeTruthy();
    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.getByRole("region", { name: "Unit G-01" })).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("region", { name: "Unit G-01" })).toBeNull();
    expect(new URLSearchParams(window.location.search).get("unit")).toBeNull();
  });

  it("announces the card of the focused hotspot in a polite live region", () => {
    render(<SceneStage {...stage()} />);
    const live = screen.getByTestId("card-announcement");
    expect(live.getAttribute("aria-live")).toBe("polite");
    expect(live.textContent).toBe("");
    fireEvent.focus(screen.getByRole("button", { name: "Ground floor" }));
    expect(live.textContent).toBe("Ground floor, 2 units, Available 1, Reserved 1, Sold 0");
    fireEvent.focus(screen.getByRole("button", { name: "Unit G-01, Available" }));
    expect(live.textContent).toMatch(/^Unit G-01, Available, Apartment, Bedrooms 3, 145 m², EGP/);
    fireEvent.blur(screen.getByRole("button", { name: "Unit G-01, Available" }));
    expect(live.textContent).toBe("");
  });

  it("announces in Arabic for an Arabic viewer", () => {
    render(<SceneStage {...stage("ar")} />);
    fireEvent.focus(screen.getByRole("button", { name: "الدور الأرضي" }));
    expect(screen.getByTestId("card-announcement").textContent).toContain("متاح ١");
  });
});
