import { act, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Hotspot, Scene } from "@/modules/schema";
import { SceneView, type SceneRendererProps } from "../index";
import * as mapping from "./model-3d-mapping";

// The real canvas needs WebGL; a stub stands in for the lazily loaded module.
vi.mock("./model-3d-canvas", () => ({
  default: ({ modelUrl }: { modelUrl: string }) => <div data-testid="canvas-stub">{modelUrl}</div>,
}));

const sq: [number, number][] = [[0, 0], [10, 0], [10, 10]];
const scene: Scene = {
  id: "model",
  kind: "building",
  type: "model-3d",
  title: { ar: "نموذج", en: "Tower model" },
  image: { path: "images/poster.jpg", width: 400, height: 300 },
  model: { path: "models/tower.glb" },
  hotspots: [
    { id: "a", points: sq, mesh: "Unit_A1", target: { unit: "A-1" } },
    { id: "b", points: sq, mesh: "Unit_B1", target: { unit: "B-1" } },
  ],
  children: [],
};

const props = (overrides: Partial<SceneRendererProps> = {}): SceneRendererProps => ({
  scene,
  imageUrl: "/files/tower/images/poster.jpg",
  unitStatusOf: () => "available",
  hotspotLabel: (h: Hotspot) => ("unit" in h.target ? `Unit ${h.target.unit}` : h.id),
  ...overrides,
});

afterEach(() => vi.restoreAllMocks());

describe("Model3DScene", () => {
  it("shows the poster without WebGL, and on the server", () => {
    vi.spyOn(mapping, "supportsWebGL").mockReturnValue(false);
    const { container } = render(<SceneView {...props()} />);
    expect(container.querySelector("[data-model-view]")?.getAttribute("data-model-view")).toBe("poster");
    expect(screen.getByRole("img", { name: "Tower model" }).getAttribute("src")).toBe("/files/tower/images/poster.jpg");
    expect(screen.queryByTestId("canvas-stub")).toBeNull();
    expect(renderToString(<SceneView {...props()} />)).toContain('data-model-view="poster"');
  });

  it("loads the 3D canvas with the model URL when WebGL is there", async () => {
    vi.spyOn(mapping, "supportsWebGL").mockReturnValue(true);
    await act(async () => {
      render(<SceneView {...props()} />);
    });
    expect(await screen.findByTestId("canvas-stub")).toBeTruthy();
    expect(screen.getByTestId("canvas-stub").textContent).toBe("/files/tower/models/tower.glb");
  });

  it("keeps a list of the scene's units that opens them and reports hover and focus", () => {
    vi.spyOn(mapping, "supportsWebGL").mockReturnValue(false);
    const onSelect = vi.fn();
    const onHover = vi.fn();
    render(<SceneView {...props({ onSelect, onHover })} />);
    const list = screen.getByRole("list", { name: "Units in this view" });
    const buttons = list.querySelectorAll("button");
    expect([...buttons].map((b) => b.textContent)).toEqual(["Unit A-1", "Unit B-1"]);
    fireEvent.click(screen.getByRole("button", { name: "Unit B-1" }));
    expect(onSelect.mock.calls[0][0].id).toBe("b");
    fireEvent.focus(screen.getByRole("button", { name: "Unit A-1" }));
    expect(onHover).toHaveBeenLastCalledWith(expect.objectContaining({ id: "a" }));
    fireEvent.blur(screen.getByRole("button", { name: "Unit A-1" }));
    expect(onHover).toHaveBeenLastCalledWith(null);
  });
});
