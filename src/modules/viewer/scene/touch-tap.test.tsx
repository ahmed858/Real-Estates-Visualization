// Touch screens have no hover: the first tap shows a hotspot and its card,
// the second tap opens it, a tap on the image elsewhere hides it.
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import type { Scene } from "@/modules/schema";
import { SceneStage, type SceneStageProps } from "../index";

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

const props: SceneStageProps = {
  scene,
  imageUrl: "/x.svg",
  units: { "G-01": { code: "G-01", type: "Apartment", floor: 0, bedrooms: 3, bathrooms: 2, areaM2: 145, price: 2500000, status: "available" } },
  sceneTitles: { ground: "Ground floor" },
  sceneSummaries: {},
  sceneHrefs: { ground: "/p/demo/ground" },
  currency: "EGP",
  locale: "en",
};

const tap = (el: Element) => {
  fireEvent.pointerDown(el, { pointerType: "touch" });
  fireEvent.click(el);
};
const floor = () => screen.getByRole("button", { name: "Ground floor" });
const unit = () => screen.getByRole("button", { name: "Unit G-01, Available" });

beforeEach(() => {
  push.mockClear();
  window.history.replaceState(null, "", "/p/demo");
});

describe("touch taps on hotspots", () => {
  it("shows a scene hotspot's card on the first tap and opens the scene on the second", () => {
    render(<SceneStage {...props} />);
    tap(floor());
    expect(screen.getByRole("tooltip").textContent).toContain("Ground floor");
    expect(floor().getAttribute("data-active")).toBe("true");
    expect(push).not.toHaveBeenCalled();
    tap(floor());
    expect(push).toHaveBeenCalledWith("/p/demo/ground");
  });

  it("selects a unit on the second tap only", () => {
    render(<SceneStage {...props} />);
    tap(unit());
    expect(screen.getByRole("tooltip").textContent).toContain("Unit G-01");
    expect(window.location.search).toBe("");
    tap(unit());
    expect(new URLSearchParams(window.location.search).get("unit")).toBe("G-01");
  });

  it("moves the card to another hotspot on a tap there, and hides it on a tap on the image", () => {
    const { container } = render(<SceneStage {...props} />);
    tap(floor());
    tap(unit());
    expect(screen.getByRole("tooltip").textContent).toContain("Unit G-01");
    expect(push).not.toHaveBeenCalled();
    fireEvent.mouseLeave(unit());
    expect(screen.getByRole("tooltip")).toBeTruthy();
    tap(container.querySelector("svg") as SVGSVGElement);
    expect(screen.queryByRole("tooltip")).toBeNull();
    expect(unit().getAttribute("data-active")).toBeNull();
  });

  it("keeps mouse clicks opening on the first click", () => {
    render(<SceneStage {...props} />);
    fireEvent.pointerDown(floor(), { pointerType: "mouse" });
    fireEvent.click(floor());
    expect(push).toHaveBeenCalledWith("/p/demo/ground");
  });
});
