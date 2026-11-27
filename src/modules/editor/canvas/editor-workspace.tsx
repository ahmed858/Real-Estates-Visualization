"use client";
// Editing one scene: the selected hotspot, the keyboard shortcuts, the drawing
// canvas with a small toolbar, the target picker and the child scenes.
// SceneWorkspace is controlled (the editor state comes from EditorSession, so
// edits survive switching scenes); EditorWorkspace owns its own state for a
// single scene. Edits live in the page until export (U-607).
// On a rotation-360 scene a frame strip picks what the canvas shows: the poster
// or one frame, whose hotspot polygons are edited through frame commands.
import { useEffect, useReducer, useState, type Dispatch } from "react";
import { createSceneTree } from "@/modules/domain";
import type { ProjectConfig, Scene, SceneImage } from "@/modules/schema";
import { fileBaseFrom, sceneOnFrame, wrapFrame } from "@/modules/viewer";
import { AddSceneForm } from "../scenes/add-scene-form";
import type { EditorCommand } from "../state/commands";
import { canRedo, canUndo, createEditorState, editorReducer, type EditorAction, type EditorState } from "../state/editor-state";
import { DrawingCanvas } from "./drawing-canvas";
import { nextHotspotId } from "./image-point";
import { hotspotIds, targetOptions } from "../targets/target-options";
import { TargetPicker } from "../targets/target-picker";

interface SceneWorkspaceBaseProps {
  sceneId: string;
  imageUrl: string;
  /** Unit codes from the project's units source, for the target picker. */
  unitCodes?: readonly string[];
  /** Images of the project folder with their sizes, for adding a child scene. */
  images?: readonly SceneImage[];
}

export interface EditorWorkspaceProps extends SceneWorkspaceBaseProps {
  config: ProjectConfig;
}

export interface SceneWorkspaceProps extends SceneWorkspaceBaseProps {
  /** Hotspot selected when the workspace opens (e.g. from a problem link). */
  initialSelectedId?: string;
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

const NUDGE: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

const otherIds = (ids: Set<string>, own: string) => {
  ids.delete(own);
  return ids;
};

/** A single scene with its own editor state. */
export function EditorWorkspace({ config, ...props }: EditorWorkspaceProps) {
  const [state, dispatch] = useReducer(editorReducer, config, createEditorState);
  return <SceneWorkspace state={state} dispatch={dispatch} {...props} />;
}

/** Commands from the canvas that edit a polygon, given the frame shown (undefined for the poster). */
function onFrame(command: EditorCommand, frame: number | undefined): EditorCommand {
  if (frame === undefined) return command;
  if (command.type === "start-hotspot" || command.type === "move-vertex" || command.type === "delete-vertex") return { ...command, frame };
  return command;
}

export function SceneWorkspace({ state, dispatch, sceneId, imageUrl, unitCodes = [], images = [], initialSelectedId }: SceneWorkspaceProps) {
  const [selected, setSelected] = useState<string | undefined>(initialSelectedId);
  const [shownFrame, setFrame] = useState<number>();
  const doc = state.present;
  const scene = createSceneTree(doc.config).get(sceneId);
  const rotation = scene.type === "rotation-360" ? scene.rotation : undefined;
  const frame = rotation && shownFrame !== undefined && shownFrame <= rotation.count ? shownFrame : undefined;
  const canvasScene: Scene = rotation && frame !== undefined ? sceneOnFrame(scene, rotation, frame) : scene;
  const canvasUrl = frame !== undefined ? `${fileBaseFrom(imageUrl, scene.image.path)}${canvasScene.image.path}` : imageUrl;
  const draft = doc.draft?.sceneId === sceneId && doc.draft.frame === frame ? doc.draft.points : undefined;
  const selectedHotspot = scene.hotspots.find((h) => h.id === selected);
  const selectedId = selectedHotspot?.id;
  const onThisFrame = frame !== undefined && !!selectedHotspot?.frames?.[String(frame)];

  const run = (canvasCommand: EditorCommand) => {
    const command = onFrame(canvasCommand, frame);
    // A shape drawn for an existing hotspot on a frame keeps that hotspot selected.
    if (command.type === "close-polygon") setSelected(doc.draft?.hotspotId ?? command.hotspotId);
    if (command.type === "start-hotspot") setSelected(undefined);
    dispatch({ type: "do", command });
  };
  const deleteSelected = () => {
    if (!selectedId) return;
    dispatch({ type: "do", command: { type: "delete-hotspot", sceneId, hotspotId: selectedId } });
    setSelected(undefined);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? "redo" : "undo" });
      } else if (e.key === "Escape") {
        if (draft) dispatch({ type: "do", command: { type: "cancel-draft" } });
        else setSelected(undefined);
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedId && !draft) {
        e.preventDefault();
        dispatch({ type: "do", command: { type: "delete-hotspot", sceneId, hotspotId: selectedId } });
        setSelected(undefined);
      } else if (e.key in NUDGE && selectedId && !draft) {
        // Arrow keys move the selected polygon by 1 px (10 px with Shift).
        e.preventDefault();
        const [dx, dy] = NUDGE[e.key].map((d) => d * (e.shiftKey ? 10 : 1));
        dispatch({ type: "do", command: { type: "nudge", sceneId, hotspotId: selectedId, ...(frame !== undefined && { frame }), dx, dy } });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [draft, selectedId, sceneId, frame, dispatch]);

  const copyToNext = () => {
    if (!rotation || frame === undefined || !selectedId) return;
    const to = wrapFrame(frame + 1, rotation.count);
    dispatch({ type: "do", command: { type: "copy-frame", sceneId, hotspotId: selectedId, from: frame, to } });
    setFrame(to);
  };

  const button = "rounded border border-white/20 px-3 py-1 text-sm hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent";
  return (
    <section className="flex flex-col gap-3" aria-label="Drawing">
      <div role="toolbar" aria-label="Edit" className="flex flex-wrap items-center gap-2">
        <button type="button" className={button} onClick={() => dispatch({ type: "undo" })} disabled={!canUndo(state)}>
          Undo
        </button>
        <button type="button" className={button} onClick={() => dispatch({ type: "redo" })} disabled={!canRedo(state)}>
          Redo
        </button>
        <button type="button" className={button} onClick={deleteSelected} disabled={!selectedId}>
          Delete hotspot
        </button>
        <span className="text-sm text-zinc-400" aria-live="polite">
          {draft
            ? `Drawing: ${draft.length} points. Click the first point to close, Escape to cancel.`
            : selectedId
              ? `Selected ${selectedId}. Drag a corner to move it, Delete to remove it.`
              : "Click the image to start a shape, or click a hotspot to select it."}
        </span>
      </div>
      {rotation && (
        <div role="group" aria-label="Rotation frames" className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-1">
            {[undefined, ...Array.from({ length: rotation.count }, (_, i) => i + 1)].map((n) => (
              <button
                key={n ?? "poster"}
                type="button"
                aria-pressed={frame === n}
                aria-label={n === undefined ? "Poster" : `Frame ${n}`}
                data-has-polygon={n !== undefined && selectedHotspot?.frames?.[String(n)] ? "true" : undefined}
                className={`min-w-8 rounded border px-2 py-0.5 text-xs ${frame === n ? "border-amber-400 bg-amber-400/20" : "border-white/20 hover:bg-white/10"} data-[has-polygon=true]:underline`}
                onClick={() => setFrame(n)}
              >
                {n ?? "Poster"}
              </button>
            ))}
          </div>
          {frame !== undefined && selectedId && !draft && (
            <div className="flex flex-wrap items-center gap-2">
              {onThisFrame ? (
                <>
                  <button type="button" className={button} onClick={copyToNext}>
                    Copy to next frame
                  </button>
                  <button type="button" className={button} onClick={() => dispatch({ type: "do", command: { type: "remove-frame", sceneId, hotspotId: selectedId, frame } })}>
                    Remove from this frame
                  </button>
                </>
              ) : (
                <button type="button" className={button} onClick={() => dispatch({ type: "do", command: { type: "start-hotspot", sceneId, frame, hotspotId: selectedId } })}>
                  Draw {selectedId} on frame {frame}
                </button>
              )}
              <span className="text-xs text-zinc-400">Arrow keys nudge the selected polygon (Shift: 10 px).</span>
            </div>
          )}
        </div>
      )}
      <DrawingCanvas
        scene={canvasScene}
        imageUrl={canvasUrl}
        title={frame === undefined ? scene.title.en : `${scene.title.en}, frame ${frame}`}
        draft={draft}
        selectedId={selectedId}
        onSelect={setSelected}
        onCommand={run}
        nextHotspotId={nextHotspotId(doc.config)}
      />
      {selectedHotspot && !draft && (
        <TargetPicker
          key={selectedHotspot.id}
          hotspotId={selectedHotspot.id}
          target={selectedHotspot.target}
          options={targetOptions(doc.config, sceneId, unitCodes)}
          takenIds={otherIds(hotspotIds(doc.config), selectedHotspot.id)}
          onApply={(target, id) => {
            dispatch({ type: "do", command: { type: "set-target", sceneId, hotspotId: selectedHotspot.id, target, id } });
            setSelected(id);
          }}
        />
      )}
      <p className="text-sm text-zinc-400">
        {scene.id} · {scene.image.width}×{scene.image.height} px · {scene.hotspots.length} hotspots
      </p>
      <section aria-label="Child scenes" className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Child scenes</h2>
        {scene.children.length > 0 ? (
          <ul className="text-sm text-zinc-300">
            {scene.children.map((c) => (
              <li key={c.id}>
                {c.title.en} · {c.id} · {c.image.path}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-400">None yet.</p>
        )}
        <AddSceneForm config={doc.config} images={images} onAdd={(child) => dispatch({ type: "do", command: { type: "add-scene", parentId: sceneId, scene: child } })} />
      </section>
    </section>
  );
}
