import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, prefetch: () => {} }) }));

import type { Scene } from "@/modules/schema";
import { SceneStage, type SceneStageProps } from "../index";

const scene: Scene = {
  id: "facade",
  kind: "facade",
  type: "image-2d",
  title: { ar: "الواجهة", en: "Facade" },
  image: { path: "images/facade.svg", width: 800, height: 600 },
  hotspots: [
    { id: "ground", points: [[100, 300], [700, 300], [700, 500], [100, 500]], target: { scene: "ground" } },
    { id: "g-01", points: [[0, 0], [200, 0], [200, 100], [0, 100]], target: { unit: "G-01" } },
  ],
  children: [],
};
const unit = { code: "G-01", type: "Apartment", floor: 0, bedrooms: 3, bathrooms: 2, areaM2: 145, price: 2500000, status: "available" } as const;
const props = (tour: SceneStageProps["tour"]): SceneStageProps => ({
  scene,
  imageUrl: "/files/demo/images/facade.svg",
  units: { "G-01": unit },
  sceneTitles: { ground: "Ground floor" },
  sceneSummaries: {},
  sceneHrefs: { ground: "/p/demo/ground" },
  currency: "EGP",
  locale: "en",
  tour,
});

const withQuery = (query: string) => window.history.replaceState(null, "", `/p/demo${query}`);

describe("guided tour on a scene", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    push.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
    withQuery("");
  });

  it("does nothing without ?tour=1", () => {
    withQuery("");
    render(<SceneStage {...props({ kind: "scene", hotspotId: "ground", href: "/p/demo/ground?tour=1" })} />);
    act(() => vi.advanceTimersByTime(10_000));
    expect(push).not.toHaveBeenCalled();
    expect(screen.queryByTestId("tour-bar")).toBeNull();
  });

  it("zooms into the next scene's hotspot, then opens it", () => {
    withQuery("?tour=1");
    render(<SceneStage {...props({ kind: "scene", hotspotId: "ground", href: "/p/demo/ground?tour=1" })} />);
    expect(screen.getByTestId("tour-bar").textContent).toContain("Guided tour");
    act(() => vi.advanceTimersByTime(1400));
    const zoomed = screen.getByTestId("scene-stage").querySelector<HTMLElement>('[style*="scale(2.6)"]');
    expect(zoomed?.style.transformOrigin).toBe("50.00% 66.67%");
    act(() => vi.advanceTimersByTime(1000));
    expect(push).toHaveBeenCalledWith("/p/demo/ground?tour=1");
  });

  it("shows the unit, selects it and ends the tour when there is no 360° view", () => {
    withQuery("?tour=1");
    render(<SceneStage {...props({ kind: "unit", hotspotId: "g-01", code: "G-01" })} />);
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByTestId("hover-card")).toBeTruthy();
    act(() => vi.advanceTimersByTime(2000));
    const query = new URLSearchParams(window.location.search);
    expect(query.get("unit")).toBe("G-01");
    expect(query.get("tour")).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });

  it("enters the unit's 360° view at the end", () => {
    withQuery("?tour=1");
    render(<SceneStage {...props({ kind: "unit", hotspotId: "g-01", code: "G-01", viewHref: "/p/demo/tour-a" })} />);
    act(() => vi.advanceTimersByTime(7000));
    expect(push).toHaveBeenCalledWith("/p/demo/tour-a");
  });

  it("stops when the visitor presses anything", () => {
    withQuery("?tour=1");
    render(<SceneStage {...props({ kind: "scene", hotspotId: "ground", href: "/p/demo/ground?tour=1" })} />);
    fireEvent.pointerDown(window);
    act(() => vi.advanceTimersByTime(10_000));
    expect(push).not.toHaveBeenCalled();
    expect(new URLSearchParams(window.location.search).get("tour")).toBeNull();
    expect(screen.queryByTestId("tour-bar")).toBeNull();
  });
});
