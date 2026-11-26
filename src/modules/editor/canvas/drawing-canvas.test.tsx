import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseProjectConfig, type ProjectConfig } from "@/modules/schema";
import { EditorWorkspace } from "../index";

const title = (en: string) => ({ ar: `عربي ${en}`, en });

// Image 100x100 shown in a 200x200 box: 1 image pixel = 2 screen pixels.
function config(): ProjectConfig {
  const parsed = parseProjectConfig({
    schemaVersion: 1,
    project: {
      slug: "demo",
      name: title("Demo"),
      defaultLocale: "en",
      currency: "EGP",
      contact: { whatsapp: "+201001234567" },
      branding: { logo: "images/logo.svg", primaryColor: "#1a6b4f", accentColor: "#c89b3c" },
    },
    root: {
      id: "ground",
      kind: "floor",
      title: title("Ground"),
      image: { path: "images/ground.svg", width: 100, height: 100 },
      hotspots: [{ id: "g-01", points: [[10, 10], [40, 10], [40, 40], [10, 40]], target: { unit: "G-01" } }],
    },
  });
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.errors));
  return parsed.value;
}

beforeEach(() => {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 200, height: 200, x: 0, y: 0, right: 200, bottom: 200, toJSON: () => ({}) } as DOMRect);
});
afterEach(() => vi.restoreAllMocks());

const setup = () => {
  const view = render(<EditorWorkspace config={config()} sceneId="ground" imageUrl="/files/demo/images/ground.svg" />);
  const canvas = screen.getByRole("application", { name: "Ground: drawing canvas" });
  const q = (selector: string) => view.container.querySelector(selector);
  /** Clicks the canvas at an image-pixel position. */
  const clickAt = (x: number, y: number) => fireEvent.click(canvas, { clientX: x * 2, clientY: y * 2 });
  return { canvas, q, clickAt, all: (selector: string) => view.container.querySelectorAll(selector) };
};

const key = (k: string, extra: KeyboardEventInit = {}) => fireEvent.keyDown(window, { key: k, ...extra });

describe("DrawingCanvas", () => {
  it("renders existing hotspots in image pixels, coloured like the viewer", () => {
    const { canvas, q } = setup();
    expect(canvas.getAttribute("viewBox")).toBe("0 0 100 100");
    const polygon = q('[data-hotspot="g-01"]') as SVGElement;
    expect(polygon.getAttribute("points")).toBe("10,10 40,10 40,40 10,40");
    expect(polygon.style.fill).toBe("#2b8a3e");
  });

  it("adds points where the image is clicked and closes on the first point", () => {
    const { q, all, clickAt } = setup();
    clickAt(60, 60);
    clickAt(90, 60);
    clickAt(90, 90);
    expect(q("[data-draft]")?.getAttribute("points")).toBe("60,60 90,60 90,90");
    expect(all("[data-vertex^='draft:']")).toHaveLength(3);
    // Closing by clicking the first vertex handle.
    const first = q("[data-vertex='draft:0']")!;
    fireEvent.mouseDown(first);
    fireEvent.mouseUp(first);
    expect(q("[data-draft]")).toBeNull();
    expect(q('[data-hotspot="shape-1"]')?.getAttribute("points")).toBe("60,60 90,60 90,90");
    expect(q('[data-hotspot="shape-1"]')?.getAttribute("aria-selected")).toBe("true");
  });

  it("closes when a click lands near the first point", () => {
    const { q, clickAt } = setup();
    clickAt(60, 60);
    clickAt(90, 60);
    clickAt(90, 90);
    clickAt(62, 61); // 8 screen px tolerance = 4 image px
    expect(q('[data-hotspot="shape-1"]')?.getAttribute("points")).toBe("60,60 90,60 90,90");
  });

  it("drags a vertex of the selected hotspot as one undoable step", () => {
    const { canvas, q } = setup();
    fireEvent.click(q('[data-hotspot="g-01"]')!);
    const vertex = q("[data-vertex='g-01:2']")!;
    fireEvent.mouseDown(vertex);
    fireEvent.mouseMove(canvas, { clientX: 100, clientY: 120 });
    fireEvent.mouseMove(canvas, { clientX: 110, clientY: 130 });
    fireEvent.mouseUp(canvas);
    expect(q('[data-hotspot="g-01"]')?.getAttribute("points")).toBe("10,10 40,10 55,65 10,40");
    key("z", { ctrlKey: true });
    expect(q('[data-hotspot="g-01"]')?.getAttribute("points")).toBe("10,10 40,10 40,40 10,40");
    key("z", { metaKey: true, shiftKey: true });
    expect(q('[data-hotspot="g-01"]')?.getAttribute("points")).toBe("10,10 40,10 55,65 10,40");
  });

  it("drags a vertex of the shape in progress", () => {
    const { canvas, q, clickAt } = setup();
    clickAt(60, 60);
    clickAt(90, 60);
    fireEvent.mouseDown(q("[data-vertex='draft:1']")!);
    fireEvent.mouseMove(canvas, { clientX: 160, clientY: 140 });
    fireEvent.mouseUp(canvas);
    expect(q("[data-draft]")?.getAttribute("points")).toBe("60,60 80,70");
  });

  it("selects a hotspot and deletes it with the Delete key or the toolbar button, undo restores it", () => {
    const { q } = setup();
    fireEvent.click(q('[data-hotspot="g-01"]')!);
    key("Delete");
    expect(q('[data-hotspot="g-01"]')).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(q('[data-hotspot="g-01"]')).not.toBeNull();
    fireEvent.click(q('[data-hotspot="g-01"]')!);
    fireEvent.click(screen.getByRole("button", { name: "Delete hotspot" }));
    expect(q('[data-hotspot="g-01"]')).toBeNull();
  });

  it("deselects on a click on the image without starting a shape", () => {
    const { q, clickAt } = setup();
    fireEvent.click(q('[data-hotspot="g-01"]')!);
    clickAt(80, 80);
    expect(q('[data-hotspot="g-01"]')?.getAttribute("aria-selected")).toBe("false");
    expect(q("[data-draft]")).toBeNull();
  });

  it("adds a point instead of selecting when drawing over an existing hotspot", () => {
    const { q, clickAt } = setup();
    clickAt(60, 60);
    fireEvent.click(q('[data-hotspot="g-01"]')!, { clientX: 40, clientY: 40 });
    expect(q("[data-draft]")?.getAttribute("points")).toBe("60,60 20,20");
  });

  it("cancels the shape in progress with Escape", () => {
    const { q, clickAt } = setup();
    clickAt(60, 60);
    clickAt(90, 60);
    key("Escape");
    expect(q("[data-draft]")).toBeNull();
    key("z", { ctrlKey: true });
    expect(q("[data-draft]")?.getAttribute("points")).toBe("60,60 90,60");
  });

  it("undoes and redoes drawing with the toolbar and the keyboard", () => {
    const { q, clickAt } = setup();
    const undo = screen.getByRole("button", { name: "Undo" });
    const redo = screen.getByRole("button", { name: "Redo" });
    expect(undo.hasAttribute("disabled")).toBe(true);
    clickAt(60, 60);
    clickAt(90, 60);
    fireEvent.click(undo);
    expect(q("[data-draft]")?.getAttribute("points")).toBe("60,60");
    expect(redo.hasAttribute("disabled")).toBe(false);
    key("Z", { ctrlKey: true, shiftKey: true });
    expect(q("[data-draft]")?.getAttribute("points")).toBe("60,60 90,60");
  });

  it("stores rounded image pixels clamped to the image", () => {
    const { q, clickAt } = setup();
    clickAt(10.4, 20.6);
    clickAt(150, -5);
    expect(q("[data-draft]")?.getAttribute("points")).toBe("10,21 100,0");
  });
});
