import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseProjectConfig, type ProjectConfig } from "@/modules/schema";
import { EditorWorkspace, liveFindings } from "../index";

const title = (en: string) => ({ ar: `عربي ${en}`, en });

// Poster 100x100, frames 200x200 shown in a 200x200 box (1 frame pixel = 1 screen pixel).
function input(frames: Record<string, [number, number][]> = { "1": [[100, 100], [140, 100], [140, 140], [100, 140]] }) {
  return {
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
      id: "spin",
      kind: "building",
      type: "rotation-360",
      title: title("Spin"),
      image: { path: "images/poster.svg", width: 100, height: 100 },
      rotation: { frames: "rotations/spin/f-{index}.svg", count: 3, width: 200, height: 200 },
      hotspots: [{ id: "a", points: [[10, 10], [40, 10], [40, 40], [10, 40]], frames, target: { unit: "A-1" } }],
    },
  };
}

function config(): ProjectConfig {
  const parsed = parseProjectConfig(input());
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.errors));
  return parsed.value;
}

beforeEach(() => {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 200, height: 200, x: 0, y: 0, right: 200, bottom: 200, toJSON: () => ({}) } as DOMRect);
});
afterEach(() => vi.restoreAllMocks());

const setup = () => {
  const view = render(<EditorWorkspace config={config()} sceneId="spin" imageUrl="/files/demo/images/poster.svg" />);
  const q = (selector: string) => view.container.querySelector(selector);
  const frameButton = (name: string) => screen.getByRole("button", { name });
  return { q, frameButton, canvas: () => view.container.querySelector('[role="application"]') as SVGSVGElement };
};

describe("Editor on a rotation-360 scene", () => {
  it("shows the poster first, then a frame with its image, size and polygons", () => {
    const { q, frameButton, canvas } = setup();
    expect(frameButton("Poster").getAttribute("aria-pressed")).toBe("true");
    expect(canvas().getAttribute("viewBox")).toBe("0 0 100 100");
    expect(q('[data-hotspot="a"]')?.getAttribute("points")).toBe("10,10 40,10 40,40 10,40");

    fireEvent.click(frameButton("Frame 1"));
    expect(canvas().getAttribute("aria-label")).toBe("Spin, frame 1: drawing canvas");
    expect(canvas().getAttribute("viewBox")).toBe("0 0 200 200");
    expect(q("image")?.getAttribute("href")).toBe("/files/demo/rotations/spin/f-1.svg");
    expect(q('[data-hotspot="a"]')?.getAttribute("points")).toBe("100,100 140,100 140,140 100,140");

    // Frame 2 has no polygon for "a", so it is not drawn there.
    fireEvent.click(frameButton("Frame 2"));
    expect(q("image")?.getAttribute("href")).toBe("/files/demo/rotations/spin/f-2.svg");
    expect(q('[data-hotspot="a"]')).toBeNull();
  });

  it("copies the selected polygon to the next frame, nudges it with the arrow keys, and undoes", () => {
    const { q, frameButton } = setup();
    fireEvent.click(frameButton("Frame 1"));
    fireEvent.click(q('[data-hotspot="a"]')!);
    expect(frameButton("Frame 1").getAttribute("data-has-polygon")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Copy to next frame" }));
    expect(frameButton("Frame 2").getAttribute("aria-pressed")).toBe("true");
    expect(frameButton("Frame 2").getAttribute("data-has-polygon")).toBe("true");
    expect(q('[data-hotspot="a"]')?.getAttribute("points")).toBe("100,100 140,100 140,140 100,140");
    fireEvent.keyDown(window, { key: "ArrowRight", shiftKey: true });
    expect(q('[data-hotspot="a"]')?.getAttribute("points")).toBe("110,100 150,100 150,140 110,140");
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(q('[data-hotspot="a"]')).toBeNull();
  });

  it("draws the selected hotspot on a frame where it has no polygon, then removes it there", () => {
    const { q, frameButton, canvas } = setup();
    fireEvent.click(frameButton("Frame 1"));
    fireEvent.click(q('[data-hotspot="a"]')!);
    fireEvent.click(frameButton("Frame 3"));
    fireEvent.click(screen.getByRole("button", { name: "Draw a on frame 3" }));
    for (const [x, y] of [[10, 10], [60, 10], [60, 60], [10, 10]]) fireEvent.click(canvas(), { clientX: x, clientY: y });
    expect(q('[data-hotspot="a"]')?.getAttribute("points")).toBe("10,10 60,10 60,60");
    expect(frameButton("Frame 3").getAttribute("data-has-polygon")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Remove from this frame" }));
    expect(q('[data-hotspot="a"]')).toBeNull();
    // The poster polygon is untouched.
    fireEvent.click(frameButton("Poster"));
    expect(q('[data-hotspot="a"]')?.getAttribute("points")).toBe("10,10 40,10 40,40 10,40");
  });
});

describe("Problems panel on rotation frames", () => {
  it("reports a polygon on a frame that does not exist and points outside the frame", () => {
    const bad = input({ "4": [[0, 0], [1, 0], [1, 1]], "1": [[0, 0], [250, 0], [1, 1]] }) as unknown as ProjectConfig;
    const messages = liveFindings({ config: bad, existingFiles: new Set() }).map((f) => `${f.location}: ${f.message}`);
    expect(messages.some((m) => /frame 4 does not exist \(the rotation has 3 frames\)/.test(m))).toBe(true);
    expect(messages.some((m) => /point \[250, 0\] is outside the frame \(200x200\)/.test(m))).toBe(true);
  });
});
