import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import type { Scene } from "@/modules/schema";
import { SceneStage, type SceneStageProps } from "../index";
import { clampZoom, MAX_ZOOM, MIN_ZOOM, pinchZoom } from "./zoom";

describe("zoom rules", () => {
  it("keeps the zoom between 1× and 3×", () => {
    expect(clampZoom(0.4)).toBe(MIN_ZOOM);
    expect(clampZoom(2)).toBe(2);
    expect(clampZoom(9)).toBe(MAX_ZOOM);
    expect(clampZoom(Number.NaN)).toBe(MIN_ZOOM);
  });

  it("scales by the change in finger distance from the pinch start", () => {
    expect(pinchZoom(1, 100, 200)).toBe(2);
    expect(pinchZoom(2, 100, 75)).toBe(1.5);
    expect(pinchZoom(2, 100, 1000)).toBe(MAX_ZOOM);
    expect(pinchZoom(1.5, 0, 50)).toBe(1.5);
  });
});

const scene: Scene = {
  id: "facade",
  kind: "facade",
  type: "image-2d",
  title: { ar: "الواجهة", en: "Facade" },
  image: { path: "images/facade.svg", width: 800, height: 600 },
  hotspots: [{ id: "ground", points: [[0, 300], [800, 300], [800, 600], [0, 600]], target: { scene: "ground" } }],
  children: [],
};
const props = (locale: "ar" | "en" = "en"): SceneStageProps => ({
  scene,
  imageUrl: "/x.svg",
  units: {},
  sceneTitles: { ground: "Ground floor" },
  sceneSummaries: {},
  sceneHrefs: { ground: "/p/demo/ground" },
  currency: "EGP",
  locale,
});
const zoom = () => Number(screen.getByTestId("zoom-content").getAttribute("data-zoom"));
const touch = (type: "pointerDown" | "pointerMove" | "pointerUp", id: number, x: number) =>
  fireEvent[type](screen.getByTestId("zoom-viewport"), { pointerType: "touch", pointerId: id, clientX: x, clientY: 0 });

beforeEach(() => push.mockClear());

describe("scene zoom", () => {
  it("starts at 1× without scrolling and zooms with the buttons up to 3×", () => {
    render(<SceneStage {...props()} />);
    expect(zoom()).toBe(1);
    expect(screen.getByTestId("zoom-viewport").className).toContain("overflow-visible");
    expect((screen.getByRole("button", { name: "Zoom out" }) as HTMLButtonElement).disabled).toBe(true);
    for (let i = 0; i < 6; i++) fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(zoom()).toBe(3);
    expect(screen.getByTestId("zoom-content").style.width).toBe("300%");
    expect(screen.getByTestId("zoom-viewport").className).toContain("overflow-auto");
    expect((screen.getByRole("button", { name: "Zoom in" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("pinch-zooms with two fingers and resets to 1×", () => {
    render(<SceneStage {...props()} />);
    touch("pointerDown", 1, 100);
    touch("pointerDown", 2, 200);
    touch("pointerMove", 2, 300);
    expect(zoom()).toBe(2);
    touch("pointerUp", 2, 300);
    touch("pointerMove", 1, 50);
    expect(zoom()).toBe(2);
    fireEvent.click(screen.getByRole("button", { name: "1×" }));
    expect(zoom()).toBe(1);
    expect(screen.queryByRole("button", { name: "1×" })).toBeNull();
  });

  it("still opens a hotspot by tap after zooming", () => {
    render(<SceneStage {...props()} />);
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    const floor = screen.getByRole("button", { name: "Ground floor" });
    fireEvent.pointerDown(floor, { pointerType: "touch" });
    fireEvent.click(floor);
    fireEvent.pointerDown(floor, { pointerType: "touch" });
    fireEvent.click(floor);
    expect(push).toHaveBeenCalledWith("/p/demo/ground");
  });

  it("labels the zoom buttons in Arabic", () => {
    render(<SceneStage {...props("ar")} />);
    expect(screen.getByRole("button", { name: "تكبير" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "تصغير" })).toBeTruthy();
  });
});
