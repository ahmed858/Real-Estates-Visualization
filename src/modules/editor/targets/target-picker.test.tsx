import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseProjectConfig, type ProjectConfig } from "@/modules/schema";
import { EditorWorkspace } from "../index";

const title = (en: string) => ({ ar: `عربي ${en}`, en });
const image = { path: "images/x.svg", width: 100, height: 100 };
const square: [number, number][] = [
  [10, 10],
  [40, 10],
  [40, 40],
  [10, 40],
];

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
      image,
      hotspots: [{ id: "band-ground", points: square, target: { scene: "ground" } }],
      children: [
        { id: "ground", kind: "floor", title: title("Ground"), image, hotspots: [{ id: "g-01", points: square, target: { unit: "G-01" } }] },
        { id: "typical", kind: "floor", title: title("Typical"), image, floors: { from: 2, to: 3, unitCode: "{floor}{suffix}" } },
      ],
    },
  });
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.errors));
  return parsed.value;
}

const codes = ["G-01", "G-02", "201", "202", "301", "302"];

beforeEach(() => {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 200, height: 200, x: 0, y: 0, right: 200, bottom: 200, toJSON: () => ({}) } as DOMRect);
});
afterEach(() => vi.restoreAllMocks());

function setup(sceneId: string) {
  const view = render(<EditorWorkspace config={config()} sceneId={sceneId} imageUrl="/x.svg" unitCodes={codes} />);
  const canvas = view.container.querySelector("svg[role='application']")!;
  const q = (selector: string) => view.container.querySelector(selector);
  const clickAt = (x: number, y: number) => fireEvent.click(canvas, { clientX: x * 2, clientY: y * 2 });
  /** Draws a triangle and closes it, which selects the new shape-1. */
  const drawShape = () => {
    clickAt(60, 60);
    clickAt(90, 60);
    clickAt(90, 90);
    clickAt(60, 60);
  };
  const form = () => within(screen.getByRole("form", { name: "Hotspot target" }));
  return { q, drawShape, form };
}

const select = (label: string, form: ReturnType<ReturnType<typeof setup>["form"]>) => form.getByLabelText(label) as HTMLSelectElement;

describe("TargetPicker", () => {
  it("only shows for a selected hotspot", () => {
    const { q, form } = setup("facade");
    expect(screen.queryByRole("form", { name: "Hotspot target" })).toBeNull();
    fireEvent.click(q('[data-hotspot="band-ground"]')!);
    expect(select("Leads to", form()).value).toBe("scene");
    expect(select("Scene", form()).value).toBe("ground");
  });

  it("points a new shape at a unit, listing units not yet drawn first, and suggests its id", () => {
    const { q, drawShape, form } = setup("ground");
    drawShape();
    const unit = select("Unit", form());
    const groups = [...unit.querySelectorAll("optgroup")].map((g) => [g.label, [...g.querySelectorAll("option")].map((o) => o.value)]);
    expect(groups).toEqual([
      ["Not yet drawn", ["201", "202", "301", "302", "G-02"]],
      ["Already drawn", ["G-01"]],
    ]);
    fireEvent.change(unit, { target: { value: "G-02" } });
    expect((form().getByLabelText("Hotspot id") as HTMLInputElement).value).toBe("g-02");
    fireEvent.click(form().getByRole("button", { name: "Apply" }));
    expect(q('[data-hotspot="shape-1"]')).toBeNull();
    expect(q('[data-hotspot="g-02"]')?.getAttribute("aria-selected")).toBe("true");
    // One undo step restores the unset shape.
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(q('[data-hotspot="shape-1"]')).not.toBeNull();
  });

  it("points a hotspot at a child scene", () => {
    const { q, drawShape, form } = setup("facade");
    drawShape();
    fireEvent.change(select("Leads to", form()), { target: { value: "scene" } });
    const scene = select("Scene", form());
    expect([...scene.options].map((o) => o.textContent)).toEqual(["Ground (ground)", "Typical (typical)"]);
    fireEvent.change(scene, { target: { value: "typical" } });
    fireEvent.click(form().getByRole("button", { name: "Apply" }));
    expect(q('[data-hotspot="typical"]')).not.toBeNull();
  });

  it("offers only unit suffixes on a typical floor", () => {
    const { q, drawShape, form } = setup("typical");
    drawShape();
    expect(select("Leads to", form()).disabled).toBe(true);
    const suffix = select("Unit suffix", form());
    expect([...suffix.options].map((o) => o.value)).toEqual(["01", "02"]);
    expect((form().getByLabelText("Hotspot id") as HTMLInputElement).value).toBe("unit-01");
    fireEvent.click(form().getByRole("button", { name: "Apply" }));
    expect(q('[data-hotspot="unit-01"]')).not.toBeNull();
  });

  it("keeps a typed id and refuses one already used", () => {
    const { q, drawShape, form } = setup("ground");
    drawShape();
    const id = form().getByLabelText("Hotspot id");
    fireEvent.change(id, { target: { value: "g-01" } });
    expect(form().getByRole("alert").textContent).toContain("already uses g-01");
    expect(form().getByRole("button", { name: "Apply" }).hasAttribute("disabled")).toBe(true);
    fireEvent.change(id, { target: { value: "Bad Id" } });
    expect(form().getByRole("alert").textContent).toContain("lowercase");
    fireEvent.change(id, { target: { value: "corner-shop" } });
    fireEvent.change(select("Unit", form()), { target: { value: "201" } });
    fireEvent.click(form().getByRole("button", { name: "Apply" }));
    expect(q('[data-hotspot="corner-shop"]')).not.toBeNull();
  });

  it("keeps the id of a hotspot whose target is unchanged", () => {
    const { q, form } = setup("ground");
    fireEvent.click(q('[data-hotspot="g-01"]')!);
    expect(select("Unit", form()).value).toBe("G-01");
    expect((form().getByLabelText("Hotspot id") as HTMLInputElement).value).toBe("g-01");
  });
});
