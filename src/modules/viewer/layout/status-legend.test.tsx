import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Scene } from "@/modules/schema";
import { SceneView, STATUS_STYLE, StatusLegend, viewerText } from "../index";

const en = viewerText("en");

describe("StatusLegend counts", () => {
  it("shows the count next to each status label", () => {
    render(<StatusLegend text={en} counts={{ available: 3, reserved: 1, sold: 0 }} />);
    const legend = screen.getByRole("region", { name: "Unit status" });
    expect(within(legend).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Available3", "Reserved1", "Sold0"]);
    expect(legend.querySelector('[data-count="sold"]')?.textContent).toBe("0");
  });

  it("hides the counts when none are given", () => {
    const { container } = render(<StatusLegend text={en} />);
    expect(container.querySelector("[data-count]")).toBeNull();
  });
});

describe("status cues beyond colour", () => {
  it("gives each status a distinct colour, and reserved and sold a non-colour cue", () => {
    const colours = new Set(Object.values(STATUS_STYLE).map((s) => s.color));
    expect(colours.size).toBe(4);
    expect(STATUS_STYLE.available.dash ?? STATUS_STYLE.available.hatch).toBeUndefined();
    expect(STATUS_STYLE.reserved.dash).toBeTruthy();
    expect(STATUS_STYLE.sold.hatch).toBe(true);
  });

  it("legend swatches match the hotspot style", () => {
    const { container } = render(<StatusLegend text={en} />);
    const rect = (s: string) => container.querySelector(`[data-swatch="${s}"] rect`) as SVGRectElement;
    expect(rect("available").getAttribute("fill")).toBe(STATUS_STYLE.available.color);
    expect(rect("available").getAttribute("stroke-dasharray")).toBeNull();
    expect(rect("reserved").getAttribute("stroke-dasharray")).toBeTruthy();
    expect(container.querySelectorAll('[data-swatch="sold"] rect')).toHaveLength(2);
    expect(container.querySelector('[data-swatch="sold"] pattern')).not.toBeNull();
  });

  it("hotspots use a dashed outline for reserved and a hatch overlay for sold", () => {
    const scene: Scene = {
      id: "ground",
      kind: "floor",
      type: "image-2d",
      title: { ar: "الأرضي", en: "Ground" },
      image: { path: "g.svg", width: 100, height: 100 },
      hotspots: ["a", "r", "s"].map((id) => ({ id, points: [[0, 0], [10, 0], [10, 10]], target: { unit: id.toUpperCase() } })),
      children: [],
    };
    const status = { A: "available", R: "reserved", S: "sold" } as const;
    const { container } = render(
      <SceneView scene={scene} imageUrl="/g.svg" unitStatusOf={(h) => ("unit" in h.target ? status[h.target.unit as keyof typeof status] : undefined)} hotspotLabel={(h) => h.id} />,
    );
    const poly = (id: string) => screen.getByRole("button", { name: id });
    expect(poly("a").getAttribute("stroke-dasharray")).toBeNull();
    expect(poly("r").getAttribute("stroke-dasharray")).toBe(STATUS_STYLE.reserved.dash);
    const hatch = container.querySelector('[data-hatch="s"]');
    expect(hatch?.getAttribute("fill")).toMatch(/^url\(#hatch-/);
    expect(hatch?.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelectorAll("[data-hatch]")).toHaveLength(1);
  });
});
