"use client";
// One editing visit of /editor/<slug>: owns the editor state for every scene
// and which scene is open, so edits (and added scenes) survive switching
// scenes and undo/redo spans them. The scene list comes from the edited
// config and switches scenes in the page, keeping ?scene=<id> in the URL.
import { useEffect, useReducer, useState } from "react";
import { createSceneTree } from "@/modules/domain";
import type { ProjectConfig, SceneImage } from "@/modules/schema";
import { SceneWorkspace } from "../canvas/editor-workspace";
import { createEditorState, editorReducer } from "../state/editor-state";
import { SceneList } from "../workspace/scene-list";
import { editorSceneHref, editorSceneItems, sceneIdFromSearch } from "./scene-items";

export interface EditorSessionProps {
  config: ProjectConfig;
  /** Scene to open first (from ?scene=), default the root. */
  initialSceneId?: string;
  /** The editor page path, e.g. "/editor/demo-villa". */
  editorPath: string;
  /** Prefix of project file URLs, e.g. "/files/demo-villa/". */
  fileBaseUrl: string;
  unitCodes?: readonly string[];
  images?: readonly SceneImage[];
}

export function EditorSession({ config, initialSceneId, editorPath, fileBaseUrl, unitCodes, images }: EditorSessionProps) {
  const [state, dispatch] = useReducer(editorReducer, config, createEditorState);
  const [openId, setOpenId] = useState(initialSceneId);
  const tree = createSceneTree(state.present.config);
  // An undo can remove the open scene (e.g. undoing "add scene"): fall back to the root.
  const sceneId = openId && tree.has(openId) ? openId : tree.root.id;
  const scene = tree.get(sceneId);

  const open = (id: string) => {
    setOpenId(id);
    window.history.pushState(null, "", editorSceneHref(editorPath, id));
  };

  useEffect(() => {
    const onPop = () => setOpenId(sceneIdFromSearch(window.location.search));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return (
    <div className="grid flex-1 gap-6 p-6 md:grid-cols-[16rem_1fr]">
      <SceneList scenes={editorSceneItems(state.present.config, editorPath)} selectedId={sceneId} onSelect={open} />
      <main>
        <SceneWorkspace key={sceneId} state={state} dispatch={dispatch} sceneId={sceneId} imageUrl={`${fileBaseUrl}${scene.image.path}`} unitCodes={unitCodes} images={images} />
      </main>
    </div>
  );
}
