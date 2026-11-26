import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));

import type { Scene } from "@/modules/schema";
import { HOTSPOT_FILL, ProjectHeader, SceneStage, ScenePanel, StatusLegend, ViewerLayout, viewerText } from "../index";

const ar = viewerText("ar");
const en = viewerText("en");

const facade: Scene = {
  id: "facade",
  kind: "facade",
  type: "image-2d",
  title: { ar: "الواجهة", en: "Facade" },
  image: { path: "images/facade.svg", width: 800, height: 600 },
  hotspots: [
    { id: "ground", points: [[0, 300], [800, 300], [800, 600]], target: { scene: "ground" } },
    { id: "g-01", points: [[0, 0], [10, 0], [10, 10]], target: { unit: "G-01" } },
    { id: "typ", points: [[0, 0], [10, 0], [10, 10]], target: { unitSuffix: "01" } },
  ],
  children: [],
};

describe("ViewerLayout", () => {
  it("puts each slot in its area, with the locale's direction and brand colours", () => {
    const { container } = render(
      <ViewerLayout
        locale="ar"
        brand={{ primary: "#1a6b4f", accent: "#c89b3c" }}
        header={<header>head</header>}
        scene={<p>scene</p>}
        legend={<p>legend</p>}
        panel={<p>panel</p>}
      />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("dir")).toBe("rtl");
    expect(root.getAttribute("lang")).toBe("ar");
    expect(root.style.getPropertyValue("--brand-primary")).toBe("#1a6b4f");
    expect(root.style.getPropertyValue("--brand-accent")).toBe("#c89b3c");
    const main = screen.getByRole("main");
    expect(within(main).getByText("scene")).toBeTruthy();
    expect(within(main).getByText("legend")).toBeTruthy();
    expect(within(screen.getByTestId("viewer-panel")).getByText("panel")).toBeTruthy();
  });

  it("is left-to-right for English", () => {
    const { container } = render(<ViewerLayout locale="en" brand={{ primary: "#000000", accent: "#ffffff" }} header={null} scene={null} legend={null} panel={null} />);
    expect((container.firstElementChild as HTMLElement).getAttribute("dir")).toBe("ltr");
  });
});

describe("ProjectHeader", () => {
  it("shows the logo and the project name as the page heading", () => {
    render(<ProjectHeader name="فيلا الحوش" logoUrl="/files/demo-villa/images/logo.svg" text={ar} />);
    expect(screen.getByRole("heading", { level: 1, name: "فيلا الحوش" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "شعار فيلا الحوش" }).getAttribute("src")).toBe("/files/demo-villa/images/logo.svg");
  });
});

describe("StatusLegend", () => {
  it("lists every status with its label and hotspot colour", () => {
    render(<StatusLegend text={en} />);
    const legend = screen.getByRole("region", { name: "Unit status" });
    expect(within(legend).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Available", "Reserved", "Sold"]);
    const swatch = legend.querySelector('[data-swatch="sold"] rect') as SVGRectElement;
    expect(swatch.getAttribute("fill")).toBe(HOTSPOT_FILL.sold);
  });

  it("uses Arabic labels for an Arabic project", () => {
    render(<StatusLegend text={ar} />);
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(["متاح", "محجوز", "مباع"]);
  });
});

describe("ScenePanel", () => {
  it("names the current scene and tells the visitor what to do", () => {
    render(<ScenePanel sceneTitle="Facade" text={en} />);
    const panel = screen.getByRole("region", { name: "Details" });
    expect(within(panel).getByRole("heading", { name: "Facade" })).toBeTruthy();
    expect(within(panel).getByText(en.selectHint)).toBeTruthy();
  });
});

describe("SceneStage", () => {
  it("names scene hotspots by scene title and unit hotspots by code and status", () => {
    render(
      <SceneStage
        scene={facade}
        imageUrl="/files/demo-villa/images/facade.svg"
        units={{ "G-01": { code: "G-01", type: "Apartment", floor: 0, bedrooms: 2, bathrooms: 1, areaM2: 120, price: 1000000, status: "reserved" } }}
        sceneTitles={{ facade: "الواجهة", ground: "الدور الأرضي" }}
        sceneSummaries={{}}
        sceneHrefs={{}}
        currency="EGP"
        locale="ar"
      />,
    );
    expect(screen.getByRole("button", { name: "الدور الأرضي" }).getAttribute("fill")).toBe(HOTSPOT_FILL.scene);
    expect(screen.getByRole("button", { name: "وحدة G-01, محجوز" }).getAttribute("fill")).toBe(HOTSPOT_FILL.reserved);
    expect(screen.getByRole("button", { name: "وحدة 01" })).toBeTruthy();
  });
});
