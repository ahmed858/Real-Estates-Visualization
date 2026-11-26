import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseProjectConfig, type ProjectConfig } from "@/modules/schema";
import { EditorSession, editorSceneItems, sceneIdFromSearch } from "../index";

const title = (en: string) => ({ ar: `عربي ${en}`, en });
const image = (path: string) => ({ path, width: 100, height: 100 });

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
      id: "facade",
      kind: "facade",
      title: title("Facade"),
      image: image("images/facade.svg"),
      children: [{ id: "ground", kind: "floor", title: title("Ground"), image: image("images/ground.svg") }],
    },
  });
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.errors));
  return parsed.value;
}

beforeEach(() => {
  window.history.replaceState(null, "", "/editor/demo");
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 200, height: 200, x: 0, y: 0, right: 200, bottom: 200, toJSON: () => ({}) } as DOMRect);
});
afterEach(() => vi.restoreAllMocks());

function setup(initialSceneId?: string) {
  const view = render(
    <EditorSession config={config()} initialSceneId={initialSceneId} editorPath="/editor/demo" fileBaseUrl="/files/demo/" images={[image("images/typical.png")]} />,
  );
  const q = (selector: string) => view.container.querySelector(selector);
  const list = () => within(screen.getByRole("navigation", { name: "Scenes" }));
  const openScene = (name: RegExp) => fireEvent.click(list().getByRole("link", { name }));
  const drawShape = () => {
    const canvas = q("svg[role='application']")!;
    const clickAt = (x: number, y: number) => fireEvent.click(canvas, { clientX: x * 2, clientY: y * 2 });
    clickAt(60, 60);
    clickAt(90, 60);
    clickAt(90, 90);
    clickAt(60, 60);
  };
  return { q, list, openScene, drawShape };
}

describe("EditorSession", () => {
  it("opens the scene from ?scene= and switches scenes in the page, keeping the URL in step", () => {
    const { q, list, openScene } = setup("ground");
    expect(q("image")?.getAttribute("href")).toBe("/files/demo/images/ground.svg");
    expect(list().getByRole("link", { name: /Ground/ }).getAttribute("aria-current")).toBe("page");
    openScene(/Facade/);
    expect(q("image")?.getAttribute("href")).toBe("/files/demo/images/facade.svg");
    expect(window.location.search).toBe("?scene=facade");
  });

  it("keeps a shape drawn on one scene after opening another and coming back", () => {
    const { q, openScene, drawShape, list } = setup();
    drawShape();
    expect(q('[data-hotspot="shape-1"]')).not.toBeNull();
    openScene(/Ground/);
    expect(q('[data-hotspot="shape-1"]')).toBeNull();
    openScene(/Facade/);
    expect(q('[data-hotspot="shape-1"]')).not.toBeNull();
    expect(list().getByRole("link", { name: /Facade/ }).textContent).toContain("facade · 1");
    // Undo spans scenes: from the ground floor it removes the facade shape.
    openScene(/Ground/);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    openScene(/Facade/);
    expect(q('[data-hotspot="shape-1"]')).toBeNull();
  });

  it("lists an added scene, opens it, and falls back to the root when undo removes it", () => {
    const { q, list, openScene } = setup();
    const form = within(screen.getByRole("form", { name: "Add a scene" }));
    fireEvent.change(form.getByLabelText("English title"), { target: { value: "Typical" } });
    fireEvent.change(form.getByLabelText("Arabic title"), { target: { value: "متكرر" } });
    fireEvent.click(form.getByRole("button", { name: "Add scene" }));
    expect(list().getAllByRole("link").map((l) => l.getAttribute("href"))).toEqual(["/editor/demo?scene=facade", "/editor/demo?scene=ground", "/editor/demo?scene=typical"]);
    openScene(/Typical/);
    expect(q("image")?.getAttribute("href")).toBe("/files/demo/images/typical.png");
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(q("image")?.getAttribute("href")).toBe("/files/demo/images/facade.svg");
    expect(list().queryByRole("link", { name: /Typical/ })).toBeNull();
  });

  it("follows the browser's Back button", () => {
    const { q, openScene } = setup();
    openScene(/Ground/);
    window.history.replaceState(null, "", "/editor/demo?scene=facade");
    fireEvent.popState(window);
    expect(q("image")?.getAttribute("href")).toBe("/files/demo/images/facade.svg");
  });
});

describe("live problems", () => {
  const files = ["images/facade.svg", "images/ground.svg", "images/logo.svg", "images/typical.png"];

  it("updates as the owner edits and links each problem to its scene and hotspot", () => {
    const view = render(<EditorSession config={config()} editorPath="/editor/demo" fileBaseUrl="/files/demo/" units={[]} existingFiles={files} />);
    const q = (selector: string) => view.container.querySelector(selector);
    const problems = within(screen.getByRole("region", { name: "Problems" }));
    // The ground floor is not opened by any facade hotspot yet.
    expect(problems.getByRole("status").textContent).toBe("0 errors, 1 warning");
    const canvas = q("svg[role='application']")!;
    const clickAt = (x: number, y: number) => fireEvent.click(canvas, { clientX: x * 2, clientY: y * 2 });
    clickAt(60, 60);
    clickAt(90, 60);
    clickAt(90, 90);
    clickAt(60, 60);
    // A new shape has no target yet: an error on facade / shape-1.
    // Like npm run validate, a schema error hides the cross-checks until it is fixed.
    expect(problems.getByRole("status").textContent).toBe("1 error, 0 warnings");
    const link = problems.getByRole("button", { name: /Error: project.json \(root.hotspots\[0\].target.unit\)/ });
    fireEvent.click(within(screen.getByRole("navigation", { name: "Scenes" })).getByRole("link", { name: /Ground/ }));
    fireEvent.click(link);
    expect(q("image")?.getAttribute("href")).toBe("/files/demo/images/facade.svg");
    expect(q('[data-hotspot="shape-1"]')?.getAttribute("aria-selected")).toBe("true");
    // Pointing it at the ground floor fixes both problems.
    fireEvent.change(screen.getByLabelText("Leads to"), { target: { value: "scene" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(problems.getByRole("status").textContent).toBe("No problems found.");
  });

  it("reports missing files and unit rows that are not drawn", () => {
    render(<EditorSession config={config()} editorPath="/editor/demo" fileBaseUrl="/files/demo/" units={[{ code: "G-01", scene: "ground", floor: 0, type: "Flat", bedrooms: 1, bathrooms: 1, areaM2: 50, price: 1, status: "available", sheetRow: 2 }]} existingFiles={["images/facade.svg"]} />);
    const text = screen.getByRole("region", { name: "Problems" }).textContent;
    expect(text).toContain('file "images/ground.svg" does not exist');
    expect(text).toContain('file "images/logo.svg" does not exist');
    expect(text).toContain('unit "G-01" is not drawn on any scene');
  });
});

describe("scene items", () => {
  it("lists scenes with depth and editor links", () => {
    expect(editorSceneItems(config(), "/editor/demo")).toEqual([
      { id: "facade", title: "Facade", depth: 0, href: "/editor/demo?scene=facade", hotspotCount: 0 },
      { id: "ground", title: "Ground", depth: 1, href: "/editor/demo?scene=ground", hotspotCount: 0 },
    ]);
    expect(sceneIdFromSearch("?scene=ground")).toBe("ground");
    expect(sceneIdFromSearch("")).toBeUndefined();
  });
});
