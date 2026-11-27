import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { parseProjectConfig, type ProjectConfig } from "@/modules/schema";
import { createEditorState, editorReducer, EditorWorkspace, type EditorCommand } from "../index";

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
    root: {
      id: "model",
      kind: "building",
      type: "model-3d",
      title: title("Model"),
      image: { path: "images/poster.svg", width: 400, height: 200 },
      model: { path: "models/tower.glb" },
      hotspots: [
        { id: "a-1", points: [[0, 0], [10, 0], [10, 10]], mesh: "Unit_A1", target: { unit: "A-1" } },
        { id: "typo", points: [[0, 0], [10, 0], [10, 10]], mesh: "Unit_Z9", target: { unit: "Z-9" } },
      ],
    },
  });
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.errors));
  return parsed.value;
}

describe("add-mesh-hotspot", () => {
  const start = createEditorState(config());
  const run = (command: EditorCommand) => editorReducer(start, { type: "do", command });

  it("adds a hotspot for the mesh with a small poster square in the middle", () => {
    const state = run({ type: "add-mesh-hotspot", sceneId: "model", mesh: "Unit_B1", hotspotId: "b-1", target: { unit: "" } });
    expect(state.present.config.root.hotspots.at(-1)).toEqual({ id: "b-1", points: [[190, 90], [210, 90], [210, 110], [190, 110]], mesh: "Unit_B1", target: { unit: "" } });
    expect(editorReducer(state, { type: "undo" }).present.config.root.hotspots).toHaveLength(2);
  });

  it("refuses a mesh that is already linked, a taken id, an empty mesh and a scene that is not model-3d", () => {
    expect(run({ type: "add-mesh-hotspot", sceneId: "model", mesh: "Unit_A1", hotspotId: "x", target: { unit: "" } })).toBe(start);
    expect(run({ type: "add-mesh-hotspot", sceneId: "model", mesh: "Unit_B1", hotspotId: "a-1", target: { unit: "" } })).toBe(start);
    expect(run({ type: "add-mesh-hotspot", sceneId: "model", mesh: " ", hotspotId: "x", target: { unit: "" } })).toBe(start);
    expect(run({ type: "add-mesh-hotspot", sceneId: "nope", mesh: "Unit_B1", hotspotId: "x", target: { unit: "" } })).toBe(start);
  });
});

describe("Model meshes in the editor", () => {
  const setup = (meshNames?: string[]) => render(<EditorWorkspace config={config()} sceneId="model" imageUrl="/files/demo/images/poster.svg" meshNames={meshNames} />);
  const row = (mesh: string) => document.querySelector(`[data-mesh="${mesh}"]`) as HTMLElement;

  it("lists the model's meshes with their linked hotspot, and hotspots naming a mesh the model lacks", () => {
    setup(["Tower", "Unit_A1", "Unit_B1"]);
    const list = screen.getByRole("region", { name: "Model meshes" });
    expect([...list.querySelectorAll("[data-mesh]")].map((li) => li.getAttribute("data-mesh"))).toEqual(["Tower", "Unit_A1", "Unit_B1", "Unit_Z9"]);
    expect(row("Unit_A1").textContent).toContain("→ a-1 (unit A-1)");
    expect(within(row("Unit_B1")).getByRole("button", { name: "Link Unit_B1" })).toBeTruthy();
    expect(row("Unit_Z9").textContent).toContain("not in the model");
  });

  it("links a mesh: creates its hotspot, selects it and opens the target picker", () => {
    setup(["Unit_A1", "Unit_B1"]);
    fireEvent.click(screen.getByRole("button", { name: "Link Unit_B1" }));
    const linked = row("Unit_B1");
    expect(linked.textContent).toMatch(/→ \S+ \(no target yet\)/);
    expect(linked.getAttribute("aria-current")).toBe("true");
    expect(screen.getByText(/^Selected /).textContent).toMatch(/Selected \S+\./);
    expect(screen.getByRole("combobox", { name: /leads to/i })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(within(row("Unit_B1")).getByRole("button", { name: "Link Unit_B1" })).toBeTruthy();
  });

  it("selects an already linked hotspot", () => {
    setup(["Unit_A1"]);
    fireEvent.click(screen.getByRole("button", { name: "Select a-1" }));
    expect(row("Unit_A1").getAttribute("aria-current")).toBe("true");
  });

  it("says when the model could not be read", () => {
    setup(undefined);
    expect(screen.getByText("The model file could not be read, so its meshes are not listed.")).toBeTruthy();
  });
});
