import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { parseProjectConfig, type ProjectConfig } from "@/modules/schema";
import { AddSceneForm, EditorWorkspace } from "../index";

const title = (en: string) => ({ ar: `عربي ${en}`, en });

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
    root: { id: "facade", kind: "facade", title: title("Facade"), image: { path: "images/facade.jpg", width: 1600, height: 1707 } },
  });
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.errors));
  return parsed.value;
}

const images = [
  { path: "images/facade.jpg", width: 1600, height: 1707 },
  { path: "images/typical.png", width: 1200, height: 900 },
];

const form = () => within(screen.getByRole("form", { name: "Add a scene" }));
const type = (label: string, value: string) => fireEvent.change(form().getByLabelText(label), { target: { value } });

describe("AddSceneForm", () => {
  it("adds a typical floor with the picked image's size and an id from the English title", () => {
    const onAdd = vi.fn();
    render(<AddSceneForm config={config()} images={images} onAdd={onAdd} />);
    expect([...(form().getByLabelText("Image") as HTMLSelectElement).options].map((o) => o.textContent)).toEqual([
      "images/facade.jpg (1600×1707)",
      "images/typical.png (1200×900)",
    ]);
    type("Image", "images/typical.png");
    type("English title", "Typical Floor");
    type("Arabic title", "الدور المتكرر");
    expect((form().getByLabelText("Scene id") as HTMLInputElement).value).toBe("typical-floor");
    fireEvent.click(form().getByLabelText(/Typical floor/));
    type("From floor", "2");
    type("To floor", "8");
    fireEvent.click(form().getByRole("button", { name: "Add scene" }));
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "typical-floor",
        kind: "floor",
        image: { path: "images/typical.png", width: 1200, height: 900 },
        floors: { from: 2, to: 8, unitCode: "{floor}{suffix}" },
      }),
    );
    // The form is cleared for the next scene.
    expect((form().getByLabelText("English title") as HTMLInputElement).value).toBe("");
  });

  it("shows the problems and adds nothing when the form is incomplete", () => {
    const onAdd = vi.fn();
    render(<AddSceneForm config={config()} images={images} onAdd={onAdd} />);
    type("English title", "Ground");
    fireEvent.click(form().getByRole("button", { name: "Add scene" }));
    expect(onAdd).not.toHaveBeenCalled();
    expect(form().getByRole("alert").textContent).toContain("title.ar");
  });

  it("only offers typical floors for floor scenes", () => {
    render(<AddSceneForm config={config()} images={images} onAdd={vi.fn()} />);
    type("Kind", "building");
    expect(form().queryByLabelText(/Typical floor/)).toBeNull();
  });

  it("switches to a 360° rotation or 3D model and picks its folder or model, keeping the image as poster", () => {
    const onAdd = vi.fn();
    const rotations = [{ folder: "rotations/tower", files: [1, 2, 3].map((n) => ({ name: `f-${n}.png`, width: 800, height: 600 })) }];
    render(<AddSceneForm config={config()} images={images} rotations={rotations} models={["models/a.glb", "models/b.glb"]} onAdd={onAdd} />);
    expect(form().queryByLabelText("Frames folder")).toBeNull();
    expect(form().queryByLabelText("Model")).toBeNull();
    expect([...(form().getByLabelText("Shown as") as HTMLSelectElement).options].map((o) => o.textContent)).toEqual(["2D image", "360° rotation", "3D model"]);

    type("Shown as", "rotation-360");
    expect([...(form().getByLabelText("Frames folder") as HTMLSelectElement).options].map((o) => o.textContent)).toEqual(["rotations/tower (3 files)"]);
    type("Poster image", "images/typical.png");
    type("English title", "Spin");
    type("Arabic title", "دوران");
    fireEvent.click(form().getByRole("button", { name: "Add scene" }));
    expect(onAdd).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: "spin", type: "rotation-360", image: images[1], rotation: { frames: "rotations/tower/f-{index}.png", count: 3, width: 800, height: 600 } }),
    );

    type("Shown as", "model-3d");
    expect(form().queryByLabelText("Frames folder")).toBeNull();
    type("Model", "models/b.glb");
    type("English title", "Model");
    type("Arabic title", "نموذج");
    fireEvent.click(form().getByRole("button", { name: "Add scene" }));
    expect(onAdd).toHaveBeenLastCalledWith(expect.objectContaining({ id: "model", type: "model-3d", model: { path: "models/b.glb" } }));
  });

  it("explains when there is no frames folder or model to pick", () => {
    const onAdd = vi.fn();
    render(<AddSceneForm config={config()} images={images} onAdd={onAdd} />);
    type("Shown as", "model-3d");
    expect(form().getByRole("option", { name: "(no .glb files in models/)" })).toBeTruthy();
    type("English title", "Model");
    type("Arabic title", "نموذج");
    fireEvent.click(form().getByRole("button", { name: "Add scene" }));
    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("pick a .glb file");
  });

  it("asks for an image when the project has none", () => {
    render(<AddSceneForm config={config()} images={[]} onAdd={vi.fn()} />);
    expect(screen.queryByRole("form", { name: "Add a scene" })).toBeNull();
    expect(screen.getByText(/images folder/)).toBeTruthy();
  });

  it("adds the scene to the editor as one undoable step", () => {
    render(<EditorWorkspace config={config()} sceneId="facade" imageUrl="/x.jpg" images={images} />);
    const children = within(screen.getByRole("region", { name: "Child scenes" }));
    expect(children.getByText("None yet.")).toBeTruthy();
    type("English title", "Ground");
    type("Arabic title", "الأرضي");
    fireEvent.click(form().getByRole("button", { name: "Add scene" }));
    expect(children.getByText(/Ground · ground · images\/facade.jpg/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(children.getByText("None yet.")).toBeTruthy();
  });
});
