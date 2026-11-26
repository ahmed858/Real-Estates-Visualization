"use client";
// Container for one editing session: owns the editor state (U-603 reducer),
// the selected hotspot and the keyboard shortcuts, and renders the drawing
// canvas with a small toolbar. Edits live in the page until export (U-607).
import { useEffect, useReducer, useState } from "react";
import { createSceneTree } from "@/modules/domain";
import type { ProjectConfig, SceneImage } from "@/modules/schema";
import { AddSceneForm } from "../scenes/add-scene-form";
import type { EditorCommand } from "../state/commands";
import { canRedo, canUndo, createEditorState, editorReducer } from "../state/editor-state";
import { DrawingCanvas } from "./drawing-canvas";
import { nextHotspotId } from "./image-point";
import { hotspotIds, targetOptions } from "../targets/target-options";
import { TargetPicker } from "../targets/target-picker";

export interface EditorWorkspaceProps {
  config: ProjectConfig;
  sceneId: string;
  imageUrl: string;
  /** Unit codes from the project's units source, for the target picker. */
  unitCodes?: readonly string[];
  /** Images of the project folder with their sizes, for adding a child scene. */
  images?: readonly SceneImage[];
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

const otherIds = (ids: Set<string>, own: string) => {
  ids.delete(own);
  return ids;
};

export function EditorWorkspace({ config, sceneId, imageUrl, unitCodes = [], images = [] }: EditorWorkspaceProps) {
  const [state, dispatch] = useReducer(editorReducer, config, createEditorState);
  const [selected, setSelected] = useState<string>();
  const doc = state.present;
  const scene = createSceneTree(doc.config).get(sceneId);
  const draft = doc.draft?.sceneId === sceneId ? doc.draft.points : undefined;
  const selectedHotspot = scene.hotspots.find((h) => h.id === selected);
  const selectedId = selectedHotspot?.id;

  const run = (command: EditorCommand) => {
    if (command.type === "close-polygon") setSelected(command.hotspotId);
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
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [draft, selectedId, sceneId]);

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
      <DrawingCanvas
        scene={scene}
        imageUrl={imageUrl}
        title={scene.title.en}
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
