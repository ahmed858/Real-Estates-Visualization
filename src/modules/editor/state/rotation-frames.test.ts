import { describe, expect, it } from "vitest";
import { parseProjectConfig, type Hotspot, type Point, type ProjectConfig } from "@/modules/schema";
import { canUndo, createEditorState, editorReducer, type EditorCommand, type EditorState } from "../index";

const title = (en: string) => ({ ar: `عربي ${en}`, en });
const sq = (x: number, y = 10): Point[] => [[x, y], [x + 20, y], [x + 20, y + 20], [x, y + 20]];

// Poster 200x100, frames 400x200 (twice the poster size), 4 frames.
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
      id: "spin",
      kind: "building",
      type: "rotation-360",
      title: title("Spin"),
      image: { path: "images/poster.svg", width: 200, height: 100 },
      rotation: { frames: "rotations/spin/f-{index}.svg", count: 4, width: 400, height: 200 },
      hotspots: [{ id: "a", points: sq(10), frames: { "1": sq(100) }, target: { unit: "A-1" } }],
    },
  });
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.errors));
  return parsed.value;
}

const run = (commands: EditorCommand[], state: EditorState = createEditorState(config())) =>
  commands.reduce((s, command) => editorReducer(s, { type: "do", command }), state);
const hotspot = (state: EditorState, id = "a"): Hotspot => state.present.config.root.hotspots.find((h) => h.id === id)!;
const valid = (state: EditorState) => expect(parseProjectConfig(state.present.config).ok).toBe(true);

describe("editor commands on rotation frames", () => {
  it("draws a new hotspot on a frame: frame polygon in frame pixels, poster polygon scaled to the poster", () => {
    const state = run([
      { type: "start-hotspot", sceneId: "spin", frame: 2 },
      { type: "add-point", point: [390, 10] },
      { type: "add-point", point: [399, 199] },
      { type: "add-point", point: [300, 199] },
      { type: "close-polygon", hotspotId: "b", target: { unit: "B-1" } },
    ]);
    expect(hotspot(state, "b")).toEqual({ id: "b", points: [[195, 5], [200, 100], [150, 100]], frames: { "2": [[390, 10], [399, 199], [300, 199]] }, target: { unit: "B-1" } });
    valid(state);
  });

  it("clamps points drawn on a frame to the frame size, not the poster size", () => {
    const state = run([
      { type: "start-hotspot", sceneId: "spin", frame: 1 },
      { type: "add-point", point: [350, 180] },
      { type: "add-point", point: [900, 900] },
    ]);
    expect(state.present.draft?.points).toEqual([[350, 180], [400, 200]]);
  });

  it("draws an existing hotspot's polygon on another frame without touching the rest", () => {
    const state = run([
      { type: "start-hotspot", sceneId: "spin", frame: 3, hotspotId: "a" },
      { type: "add-point", point: [0, 0] },
      { type: "add-point", point: [30, 0] },
      { type: "add-point", point: [30, 30] },
      { type: "close-polygon", hotspotId: "ignored", target: { unit: "" } },
    ]);
    const a = hotspot(state);
    expect(a.points).toEqual(sq(10));
    expect(a.frames).toEqual({ "1": sq(100), "3": [[0, 0], [30, 0], [30, 30]] });
    expect(a.target).toEqual({ unit: "A-1" });
    expect(state.present.config.root.hotspots).toHaveLength(1);
  });

  it("refuses frames that do not exist, a frame on a 2D scene and an unknown hotspot", () => {
    const start = createEditorState(config());
    for (const command of [
      { type: "start-hotspot", sceneId: "spin", frame: 5 },
      { type: "start-hotspot", sceneId: "spin", frame: 0 },
      { type: "start-hotspot", sceneId: "spin", hotspotId: "a" },
      { type: "start-hotspot", sceneId: "spin", frame: 2, hotspotId: "nope" },
      { type: "copy-frame", sceneId: "spin", hotspotId: "a", from: 1, to: 5 },
      { type: "copy-frame", sceneId: "spin", hotspotId: "a", from: 2, to: 3 },
      { type: "copy-frame", sceneId: "spin", hotspotId: "a", from: 1, to: 1 },
      { type: "remove-frame", sceneId: "spin", hotspotId: "a", frame: 2 },
      { type: "move-vertex", sceneId: "spin", hotspotId: "a", frame: 2, index: 0, to: [1, 1] },
    ] satisfies EditorCommand[]) {
      expect(editorReducer(start, { type: "do", command }), JSON.stringify(command)).toBe(start);
    }
  });

  it("moves and deletes vertices of a frame polygon, leaving the poster polygon alone", () => {
    const moved = run([{ type: "move-vertex", sceneId: "spin", hotspotId: "a", frame: 1, index: 0, to: [390.4, 250] }]);
    expect(hotspot(moved).frames?.["1"][0]).toEqual([390, 200]);
    expect(hotspot(moved).points).toEqual(sq(10));
    const deleted = run([{ type: "delete-vertex", sceneId: "spin", hotspotId: "a", frame: 1, index: 3 }]);
    expect(hotspot(deleted).frames?.["1"]).toEqual(sq(100).slice(0, 3));
    // A polygon keeps at least 3 points.
    expect(editorReducer(deleted, { type: "do", command: { type: "delete-vertex", sceneId: "spin", hotspotId: "a", frame: 1, index: 0 } })).toBe(deleted);
  });

  it("copies a polygon to the next frame and nudges it there, each one undoable step", () => {
    const state = run([
      { type: "copy-frame", sceneId: "spin", hotspotId: "a", from: 1, to: 2 },
      { type: "nudge", sceneId: "spin", hotspotId: "a", frame: 2, dx: 10, dy: -1 },
    ]);
    expect(hotspot(state).frames).toEqual({ "1": sq(100), "2": sq(110, 9) });
    valid(state);
    const undone = editorReducer(state, { type: "undo" });
    expect(hotspot(undone).frames).toEqual({ "1": sq(100), "2": sq(100) });
    expect(hotspot(editorReducer(undone, { type: "undo" })).frames).toEqual({ "1": sq(100) });
  });

  it("nudges the poster polygon without a frame, keeps points inside the image, and refuses a move that changes nothing", () => {
    const state = run([{ type: "nudge", sceneId: "spin", hotspotId: "a", dx: -50, dy: 0 }]);
    expect(hotspot(state).points).toEqual([[0, 10], [0, 10], [0, 30], [0, 30]]);
    expect(editorReducer(state, { type: "do", command: { type: "nudge", sceneId: "spin", hotspotId: "a", dx: -5, dy: 0 } })).toBe(state);
  });

  it("removes a hotspot from a frame, dropping the frames block when it was the last one", () => {
    const state = run([{ type: "remove-frame", sceneId: "spin", hotspotId: "a", frame: 1 }]);
    expect(hotspot(state)).toEqual({ id: "a", points: sq(10), target: { unit: "A-1" } });
    expect(canUndo(state)).toBe(true);
    expect(hotspot(editorReducer(state, { type: "undo" })).frames).toEqual({ "1": sq(100) });
  });
});
