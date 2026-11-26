import { describe, expect, it } from "vitest";
import { parseProjectConfig, type Point, type ProjectConfig, type Scene } from "@/modules/schema";
import { canRedo, canUndo, createEditorState, editorReducer, type EditorCommand, type EditorState } from "../index";

const title = (en: string) => ({ ar: `عربي ${en}`, en });
const square: Point[] = [
  [10, 10],
  [50, 10],
  [50, 50],
  [10, 50],
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
      image: { path: "images/facade.svg", width: 200, height: 100 },
      hotspots: [{ id: "band-ground", points: square, target: { scene: "ground" } }],
      children: [{ id: "ground", kind: "floor", title: title("Ground"), image: { path: "images/ground.svg", width: 100, height: 100 } }],
    },
  });
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.errors));
  return parsed.value;
}

const run = (commands: EditorCommand[], state: EditorState = createEditorState(config())) =>
  commands.reduce((s, command) => editorReducer(s, { type: "do", command }), state);

const scene = (state: EditorState, id: string): Scene => {
  const find = (s: Scene): Scene | undefined => (s.id === id ? s : s.children.map(find).find(Boolean));
  return find(state.present.config.root)!;
};

const drawTriangle: EditorCommand[] = [
  { type: "start-hotspot", sceneId: "ground" },
  { type: "add-point", point: [0, 0] },
  { type: "add-point", point: [40, 0] },
  { type: "add-point", point: [40, 40] },
];

describe("editor commands", () => {
  it("draws a hotspot: start, add points, close", () => {
    const state = run([...drawTriangle, { type: "close-polygon", hotspotId: "g-01", target: { unit: "G-01" } }]);
    expect(state.present.draft).toBeUndefined();
    expect(scene(state, "ground").hotspots).toEqual([{ id: "g-01", points: [[0, 0], [40, 0], [40, 40]], target: { unit: "G-01" } }]);
    expect(parseProjectConfig(state.present.config).ok).toBe(true);
  });

  it("clamps points to the image and rounds them to whole pixels", () => {
    const state = run([{ type: "start-hotspot", sceneId: "ground" }, { type: "add-point", point: [-5, 20.6] }, { type: "add-point", point: [130, 99.4] }]);
    expect(state.present.draft?.points).toEqual([
      [0, 21],
      [100, 99],
    ]);
  });

  it("does not close a shape with fewer than 3 points, or with a hotspot id already used on the scene", () => {
    const two = run(drawTriangle.slice(0, 3));
    expect(editorReducer(two, { type: "do", command: { type: "close-polygon", hotspotId: "g-01", target: { unit: "G-01" } } })).toBe(two);
    const dup = run([{ type: "start-hotspot", sceneId: "facade" }, { type: "add-point", point: [0, 0] }, { type: "add-point", point: [9, 0] }, { type: "add-point", point: [9, 9] }]);
    expect(editorReducer(dup, { type: "do", command: { type: "close-polygon", hotspotId: "band-ground", target: { scene: "ground" } } })).toBe(dup);
  });

  it("ignores points without a shape in progress and shapes on unknown scenes", () => {
    const start = createEditorState(config());
    expect(run([{ type: "add-point", point: [1, 1] }], start)).toBe(start);
    expect(run([{ type: "start-hotspot", sceneId: "nope" }], start)).toBe(start);
  });

  it("cancels the shape in progress, and undo brings it back", () => {
    const drawing = run([{ type: "start-hotspot", sceneId: "ground" }, { type: "add-point", point: [5, 5] }]);
    const cancelled = run([{ type: "cancel-draft" }], drawing);
    expect(cancelled.present.draft).toBeUndefined();
    expect(editorReducer(cancelled, { type: "undo" }).present.draft?.points).toEqual([[5, 5]]);
    const idle = createEditorState(config());
    expect(run([{ type: "cancel-draft" }], idle)).toBe(idle);
  });

  it("moves and deletes vertices of a saved hotspot, keeping at least 3", () => {
    const moved = run([{ type: "move-vertex", sceneId: "facade", hotspotId: "band-ground", index: 1, to: [60.2, 5] }]);
    expect(scene(moved, "facade").hotspots[0].points[1]).toEqual([60, 5]);

    const deleted = run([{ type: "delete-vertex", sceneId: "facade", hotspotId: "band-ground", index: 3 }]);
    expect(scene(deleted, "facade").hotspots[0].points).toEqual(square.slice(0, 3));
    expect(run([{ type: "delete-vertex", sceneId: "facade", hotspotId: "band-ground", index: 0 }], deleted)).toBe(deleted);
  });

  it("moves and deletes vertices of the shape in progress", () => {
    const state = run([
      ...drawTriangle,
      { type: "move-vertex", sceneId: "ground", index: 0, to: [5, 5] },
      { type: "delete-vertex", sceneId: "ground", index: 1 },
    ]);
    expect(state.present.draft?.points).toEqual([
      [5, 5],
      [40, 40],
    ]);
  });

  it("rejects vertex indexes that do not exist", () => {
    const start = createEditorState(config());
    expect(run([{ type: "move-vertex", sceneId: "facade", hotspotId: "band-ground", index: 4, to: [0, 0] }], start)).toBe(start);
    expect(run([{ type: "delete-vertex", sceneId: "facade", hotspotId: "nope", index: 0 }], start)).toBe(start);
  });

  it("deletes a hotspot and sets a hotspot target", () => {
    const retargeted = run([{ type: "set-target", sceneId: "facade", hotspotId: "band-ground", target: { unit: "V-01" } }]);
    expect(scene(retargeted, "facade").hotspots[0].target).toEqual({ unit: "V-01" });
    const deleted = run([{ type: "delete-hotspot", sceneId: "facade", hotspotId: "band-ground" }]);
    expect(scene(deleted, "facade").hotspots).toEqual([]);
  });

  it("renames a hotspot with its new target, but not to an id already used on the scene", () => {
    const renamed = run([{ type: "set-target", sceneId: "facade", hotspotId: "band-ground", target: { scene: "ground" }, id: "ground" }]);
    expect(scene(renamed, "facade").hotspots.map((h) => h.id)).toEqual(["ground"]);
    const withTwo = run([
      { type: "start-hotspot", sceneId: "facade" },
      { type: "add-point", point: [0, 0] },
      { type: "add-point", point: [9, 0] },
      { type: "add-point", point: [9, 9] },
      { type: "close-polygon", hotspotId: "shape-1", target: { unit: "" } },
    ]);
    const clash = { type: "set-target", sceneId: "facade", hotspotId: "shape-1", target: { unit: "V-01" }, id: "band-ground" } as const;
    expect(editorReducer(withTwo, { type: "do", command: clash })).toBe(withTwo);
  });

  it("never changes the config it started from", () => {
    const original = config();
    const snapshot = structuredClone(original);
    run([...drawTriangle, { type: "close-polygon", hotspotId: "g-01", target: { unit: "G-01" } }, { type: "delete-hotspot", sceneId: "facade", hotspotId: "band-ground" }], createEditorState(original));
    expect(original).toEqual(snapshot);
  });
});

describe("undo and redo", () => {
  const drawn = () => run([...drawTriangle, { type: "close-polygon", hotspotId: "g-01", target: { unit: "G-01" } }]);
  const undo = (s: EditorState) => editorReducer(s, { type: "undo" });
  const redo = (s: EditorState) => editorReducer(s, { type: "redo" });

  it("undoes the last command, back to the start", () => {
    let state = drawn();
    state = undo(state);
    expect(scene(state, "ground").hotspots).toEqual([]);
    expect(state.present.draft?.points).toHaveLength(3);
    for (let i = 0; i < 4; i++) state = undo(state);
    expect(state.present).toEqual(state.initial);
    expect(canUndo(state)).toBe(false);
    expect(undo(state)).toBe(state);
  });

  it("redoes undone commands in order", () => {
    const end = drawn();
    let state = undo(undo(end));
    expect(canRedo(state)).toBe(true);
    state = redo(redo(state));
    expect(state.present).toEqual(end.present);
    expect(canRedo(state)).toBe(false);
    expect(redo(state)).toBe(state);
  });

  it("drops the redo list after a new edit", () => {
    let state = undo(drawn());
    state = run([{ type: "add-point", point: [0, 40] }], state);
    expect(canRedo(state)).toBe(false);
    expect(state.present.draft?.points).toHaveLength(4);
  });

  it("does not record commands that did not apply", () => {
    const state = run([{ type: "add-point", point: [1, 1] }]);
    expect(canUndo(state)).toBe(false);
  });
});
