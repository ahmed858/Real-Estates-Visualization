"use client";
// Container for one editing session: owns the editor state (U-603 reducer),
// the selected hotspot and the keyboard shortcuts, and renders the drawing
// canvas with a small toolbar. Edits live in the page until export (U-607).
import { useEffect, useReducer, useState } from "react";
import { createSceneTree } from "@/modules/domain";
import type { ProjectConfig } from "@/modules/schema";
import type { EditorCommand } from "../state/commands";
import { canRedo, canUndo, createEditorState, editorReducer } from "../state/editor-state";
import { DrawingCanvas } from "./drawing-canvas";
import { nextHotspotId } from "./image-point";

export interface EditorWorkspaceProps {
  config: ProjectConfig;
  sceneId: string;
  imageUrl: string;
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

export function EditorWorkspace({ config, sceneId, imageUrl }: EditorWorkspaceProps) {
  const [state, dispatch] = useReducer(editorReducer, config, createEditorState);
  const [selected, setSelected] = useState<string>();
  const doc = state.present;
  const scene = createSceneTree(doc.config).get(sceneId);
  const draft = doc.draft?.sceneId === sceneId ? doc.draft.points : undefined;
  const selectedId = scene.hotspots.some((h) => h.id === selected) ? selected : undefined;

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
      <p className="text-sm text-zinc-400">
        {scene.id} · {scene.image.width}×{scene.image.height} px · {scene.hotspots.length} hotspots
      </p>
    </section>
  );
}
