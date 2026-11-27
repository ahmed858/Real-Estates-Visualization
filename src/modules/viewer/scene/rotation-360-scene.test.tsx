import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Hotspot, Scene } from "@/modules/schema";
import { SceneView, type SceneRendererProps } from "../index";

const sq = (x: number): [number, number][] => [[x, 0], [x + 100, 0], [x + 100, 100], [x, 100]];

const scene: Scene = {
  id: "spin",
  kind: "building",
  type: "rotation-360",
  title: { ar: "دوران", en: "Tower" },
  image: { path: "images/poster.jpg", width: 400, height: 300 },
  rotation: { frames: "rotations/spin/f-{index}.jpg", count: 4, width: 800, height: 600 },
  hotspots: [
    { id: "a", points: sq(0), frames: { "1": sq(10), "2": sq(200) }, target: { unit: "A-1" } },
    { id: "b", points: sq(0), frames: { "3": sq(300) }, target: { unit: "B-1" } },
  ],
  children: [],
};

const props = (onSelect = vi.fn()): SceneRendererProps => ({
  scene,
  imageUrl: "/files/tower/images/poster.jpg",
  unitStatusOf: (h: Hotspot) => ("unit" in h.target && h.target.unit === "A-1" ? "available" : "sold"),
  hotspotLabel: (h: Hotspot) => ("unit" in h.target ? `Unit ${h.target.unit}` : h.id),
  onSelect,
});

const img = () => screen.getByRole("img", { name: "Tower" });
const slider = () => screen.getByRole("slider", { name: "Tower: turn the view" });

beforeEach(() => {
  window.history.replaceState(null, "", "/p/tower/spin?lang=en");
});

describe("Rotation360Scene", () => {
  it("is the renderer for rotation-360 scenes and starts on frame 1 with its polygons", () => {
    const { container } = render(<SceneView {...props()} />);
    expect(img().getAttribute("src")).toBe("/files/tower/rotations/spin/f-1.jpg");
    expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe("0 0 800 600");
    expect(screen.getByRole("button", { name: "Unit A-1" }).getAttribute("points")).toBe("10,0 110,0 110,100 10,100");
    expect(screen.queryByRole("button", { name: "Unit B-1" })).toBeNull();
  });

  it("turns with the slider, keeps the angle in the URL and shows that frame's hotspots", () => {
    render(<SceneView {...props()} />);
    fireEvent.change(slider(), { target: { value: "3" } });
    expect(img().getAttribute("src")).toBe("/files/tower/rotations/spin/f-3.jpg");
    expect(window.location.search).toBe("?lang=en&frame=3");
    expect(screen.queryByRole("button", { name: "Unit A-1" })).toBeNull();
    expect(screen.getByRole("button", { name: "Unit B-1" })).toBeTruthy();
    expect(slider().getAttribute("aria-valuetext")).toBe("3 / 4");
  });

  it("opens at the frame in the URL", () => {
    window.history.replaceState(null, "", "/p/tower/spin?frame=2");
    render(<SceneView {...props()} />);
    expect(img().getAttribute("src")).toBe("/files/tower/rotations/spin/f-2.jpg");
    expect(screen.getByRole("button", { name: "Unit A-1" }).getAttribute("points")).toBe("200,0 300,0 300,100 200,100");
  });

  it("turns by dragging, wrapping around, and a drag does not open a hotspot", () => {
    const onSelect = vi.fn();
    const { container } = render(<SceneView {...props(onSelect)} />);
    const box = container.querySelector("[data-rotation-frame]") as HTMLElement;
    vi.spyOn(box, "getBoundingClientRect").mockReturnValue({ width: 400 } as DOMRect);
    // 400 px wide, 4 frames: 100 px per frame. Dragging right goes to earlier frames.
    act(() => {
      fireEvent.pointerDown(box, { clientX: 300 });
      fireEvent.pointerMove(box, { clientX: 410 });
    });
    expect(box.getAttribute("data-rotation-frame")).toBe("4");
    act(() => {
      fireEvent.pointerMove(box, { clientX: 90 });
    });
    expect(box.getAttribute("data-rotation-frame")).toBe("3");
    fireEvent.click(screen.getByRole("button", { name: "Unit B-1" }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("opens a unit with a plain click or the keyboard, like 2D", async () => {
    const onSelect = vi.fn();
    render(<SceneView {...props(onSelect)} />);
    const a = screen.getByRole("button", { name: "Unit A-1" });
    fireEvent.click(a);
    fireEvent.keyDown(a, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect.mock.calls[0][0].id).toBe("a");
  });

  it("uses fileUrl when given", () => {
    render(<SceneView {...props()} fileUrl={(p) => `https://cdn.example/${p}`} />);
    expect(img().getAttribute("src")).toBe("https://cdn.example/rotations/spin/f-1.jpg");
  });
});
