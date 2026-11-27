import { act, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Hotspot, Scene } from "@/modules/schema";
import { SceneView, type SceneRendererProps } from "../index";
import * as mapping from "./model-3d-mapping";

// The real view needs WebGL; a stub stands in for the lazily loaded module.
vi.mock("./panorama-360-canvas", () => ({
  default: ({ panoramaUrl }: { panoramaUrl: string }) => <div data-testid="panorama-stub">{panoramaUrl}</div>,
}));

const scene: Scene = {
  id: "living",
  kind: "unit-plan",
  type: "panorama-360",
  title: { ar: "الريسبشن", en: "Living room" },
  image: { path: "images/living.jpg", width: 1600, height: 900 },
  panorama: { path: "panoramas/living.jpg", width: 4096, height: 2048 },
  hotspots: [],
  children: [],
};

const props = (overrides: Partial<SceneRendererProps> = {}): SceneRendererProps => ({
  scene,
  imageUrl: "/files/tower/images/living.jpg",
  unitStatusOf: () => undefined,
  hotspotLabel: (h: Hotspot) => h.id,
  ...overrides,
});

afterEach(() => vi.restoreAllMocks());

describe("Panorama360Scene", () => {
  it("shows the poster without WebGL, and on the server", () => {
    vi.spyOn(mapping, "supportsWebGL").mockReturnValue(false);
    const { container } = render(<SceneView {...props()} />);
    expect(container.querySelector("[data-panorama-view]")?.getAttribute("data-panorama-view")).toBe("poster");
    expect(screen.getByRole("img", { name: "Living room" }).getAttribute("src")).toBe("/files/tower/images/living.jpg");
    expect(screen.queryByTestId("panorama-stub")).toBeNull();
    expect(renderToString(<SceneView {...props()} />)).toContain('data-panorama-view="poster"');
  });

  it("loads the 360° view with the panorama URL when WebGL is there", async () => {
    vi.spyOn(mapping, "supportsWebGL").mockReturnValue(true);
    await act(async () => {
      render(<SceneView {...props()} />);
    });
    expect((await screen.findByTestId("panorama-stub")).textContent).toBe("/files/tower/panoramas/living.jpg");
  });

  it("lists no places when the panorama has no hotspots", () => {
    vi.spyOn(mapping, "supportsWebGL").mockReturnValue(false);
    render(<SceneView {...props()} />);
    expect(screen.queryByRole("list", { name: "Places in this view" })).toBeNull();
  });
});
