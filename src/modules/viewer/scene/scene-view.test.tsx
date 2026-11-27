import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Hotspot, Scene } from "@/modules/schema";
import { ACTIVE_FILL_OPACITY, DEFAULT_SCENE_RENDERERS, HOTSPOT_FILL, SceneView, hotspotStyle, type SceneRendererProps } from "../index";

const scene: Scene = {
  id: "ground",
  kind: "floor",
  type: "image-2d",
  title: { ar: "الأرضي", en: "Ground floor" },
  image: { path: "images/ground.svg", width: 400, height: 300 },
  hotspots: [
    { id: "g-01", points: [[0, 0], [200, 0], [200, 300], [0, 300]], target: { unit: "G-01" } },
    { id: "g-02", points: [[200, 0], [400, 0], [400, 300], [200, 300]], target: { unit: "G-02" } },
    { id: "to-first", points: [[0, 0], [10, 0], [10, 10]], target: { scene: "first" } },
  ],
  children: [],
};

const status = { "G-01": "available", "G-02": "sold" } as const;
const props = (onSelect = vi.fn()): SceneRendererProps => ({
  scene,
  imageUrl: "/files/demo/images/ground.svg",
  unitStatusOf: (h: Hotspot) => ("unit" in h.target ? status[h.target.unit as keyof typeof status] : undefined),
  hotspotLabel: (h: Hotspot) => ("unit" in h.target ? `Unit ${h.target.unit}` : `Open ${h.id}`),
  onSelect,
});

describe("SceneView with Image2DScene", () => {
  it("draws the image and one polygon per hotspot in image pixel coordinates", () => {
    const { container } = render(<SceneView {...props()} />);
    expect(screen.getByRole("img", { name: "Ground floor" }).getAttribute("src")).toBe("/files/demo/images/ground.svg");
    expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe("0 0 400 300");
    expect(screen.getByRole("button", { name: "Unit G-01" }).getAttribute("points")).toBe("0,0 200,0 200,300 0,300");
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  it("colours unit hotspots by status and scene hotspots neutrally", () => {
    render(<SceneView {...props()} />);
    expect(screen.getByRole("button", { name: "Unit G-01" }).getAttribute("fill")).toBe(HOTSPOT_FILL.available);
    expect(screen.getByRole("button", { name: "Unit G-02" }).getAttribute("fill")).toBe(HOTSPOT_FILL.sold);
    expect(screen.getByRole("button", { name: "Open to-first" }).getAttribute("fill")).toBe(HOTSPOT_FILL.scene);
  });

  it("keeps hotspots invisible until hover or focus, then fills, outlines and glows the active one", () => {
    render(<SceneView {...props()} />);
    const g01 = screen.getByRole("button", { name: "Unit G-01" });
    const g02 = screen.getByRole("button", { name: "Unit G-02" });
    for (const p of screen.getAllByRole("button")) {
      expect(p.style.fillOpacity).toBe("0");
      expect(p.style.strokeOpacity).toBe("0");
      expect(p.getAttribute("data-active")).toBeNull();
    }
    fireEvent.mouseEnter(g01);
    expect(g01.getAttribute("data-active")).toBe("true");
    expect(Number(g01.style.fillOpacity)).toBe(ACTIVE_FILL_OPACITY);
    expect(Number(g01.style.strokeOpacity)).toBeGreaterThan(0.9);
    expect(g01.style.filter).toContain("drop-shadow");
    expect(g02.style.fillOpacity).toBe("0");
    fireEvent.mouseLeave(g01);
    expect(g01.style.fillOpacity).toBe("0");
    fireEvent.focus(g02);
    expect(g02.getAttribute("data-active")).toBe("true");
    fireEvent.blur(g02);
    expect(g02.getAttribute("data-active")).toBeNull();
  });

  it("glows unit hotspots in their status colour and scene hotspots in the brand colour", () => {
    expect(hotspotStyle(HOTSPOT_FILL.sold, true)).toMatchObject({ fill: HOTSPOT_FILL.sold, fillOpacity: ACTIVE_FILL_OPACITY });
    expect(hotspotStyle(HOTSPOT_FILL.sold, true).filter).toContain(HOTSPOT_FILL.sold);
    expect(hotspotStyle(HOTSPOT_FILL.sold, false)).toMatchObject({ fillOpacity: 0, strokeOpacity: 0, filter: "none" });
    render(<SceneView {...props()} />);
    const toFirst = screen.getByRole("button", { name: "Open to-first" });
    fireEvent.mouseEnter(toFirst);
    expect(toFirst.getAttribute("style")).toContain(`var(--brand-primary, ${HOTSPOT_FILL.scene})`);
  });

  it("selects a hotspot by click and by keyboard", () => {
    const onSelect = vi.fn();
    render(<SceneView {...props(onSelect)} />);
    fireEvent.click(screen.getByRole("button", { name: "Unit G-01" }));
    fireEvent.keyDown(screen.getByRole("button", { name: "Open to-first" }), { key: "Enter" });
    fireEvent.keyDown(screen.getByRole("button", { name: "Unit G-02" }), { key: "a" });
    expect(onSelect.mock.calls.map(([h]) => h.id)).toEqual(["g-01", "to-first"]);
  });

  it("shows a message for a renderer type that is not registered", () => {
    render(<SceneView {...props()} scene={{ ...scene, type: "not-a-renderer" as never }} />);
    expect(screen.getByRole("heading", { name: "This view is not available yet" })).toBeTruthy();
  });

  it("uses a renderer added to the registry", () => {
    const Custom = ({ scene: s }: SceneRendererProps) => <p>custom {s.id}</p>;
    render(<SceneView {...props()} scene={{ ...scene, type: "rotation-360" as never }} renderers={{ ...DEFAULT_SCENE_RENDERERS, "rotation-360": Custom }} />);
    expect(screen.getByText("custom ground")).toBeTruthy();
  });
});
