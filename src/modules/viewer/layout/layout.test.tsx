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

  it.each(["ar", "en"] as const)("puts the header and nav in the translucent bar over a dark, edge-to-edge stage (%s)", (locale) => {
    const { container } = render(
      <ViewerLayout
        locale={locale}
        brand={{ primary: "#1a6b4f", accent: "#c89b3c" }}
        header={<header>head</header>}
        nav={<nav>crumbs</nav>}
        scene={<p>scene</p>}
        legend={<p>legend</p>}
        panel={<p>panel</p>}
      />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("dir")).toBe(locale === "ar" ? "rtl" : "ltr");
    expect(root.className).toContain("bg-zinc-950");
    expect(root.className).toContain("md:[--stage-height:100dvh]");
    const stage = screen.getByTestId("viewer-stage");
    expect(stage.className).not.toMatch(/\bp-\d/);
    expect(within(stage).getByText("scene")).toBeTruthy();
    const bar = screen.getByTestId("viewer-topbar");
    expect(bar.parentElement).toBe(stage);
    expect(bar.className).toMatch(/absolute/);
    expect(bar.className).toMatch(/backdrop-blur/);
    expect(within(bar).getByText("head")).toBeTruthy();
    expect(within(bar).getByText("crumbs")).toBeTruthy();
    expect(within(bar).queryByText("scene")).toBeNull();
    expect(within(screen.getByTestId("viewer-panel")).getByText("panel")).toBeTruthy();
  });

  it.each(["ar", "en"] as const)("uses the phone frame below the md breakpoint (%s)", (locale) => {
    const { container } = render(
      <ViewerLayout locale={locale} brand={{ primary: "#000000", accent: "#ffffff" }} header={<header>head</header>} nav={<nav>crumbs</nav>} scene={<p>scene</p>} legend={<p>legend</p>} panel={<p>panel</p>} />,
    );
    const root = container.firstElementChild as HTMLElement;
    const cls = (el: HTMLElement) => el.className.split(/\s+/);
    // Stacked and never wider than the screen; the scene at most 60% of the screen tall.
    expect(cls(root)).toEqual(expect.arrayContaining(["flex-col", "md:flex-row", "overflow-x-hidden", "[--stage-height:60dvh]"]));
    // The top bar sticks above the scene on phones and covers it from md up.
    const bar = screen.getByTestId("viewer-topbar");
    expect(cls(bar)).toEqual(expect.arrayContaining(["sticky", "top-0", "md:absolute"]));
    // The panel is a bottom sheet on phones and the side column from md up.
    const panel = screen.getByTestId("viewer-panel");
    expect(cls(panel)).toEqual(expect.arrayContaining(["sticky", "bottom-0", "rounded-t-2xl", "max-h-[45dvh]", "md:static", "md:w-80"]));
    // Order in the page on phones: bar, scene, legend; then the sheet.
    const stage = screen.getByTestId("viewer-stage");
    expect([...stage.children].map((c) => c.textContent)).toEqual(["headcrumbs", "scene", "legend"]);
    expect(stage.nextElementSibling).toBe(panel);
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
