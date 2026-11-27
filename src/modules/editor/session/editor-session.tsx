"use client";
// One editing visit of /editor/<slug>: owns the editor state for every scene
// and which scene is open, so edits (and added scenes) survive switching
// scenes and undo/redo spans them. The scene list comes from the edited
// config and switches scenes in the page, keeping ?scene=<id> in the URL.
import { useDeferredValue, useEffect, useMemo, useReducer, useState } from "react";
import { createSceneTree } from "@/modules/domain";
import type { ProjectConfig, SceneImage, UnitRow } from "@/modules/schema";
import { liveFindings } from "../validation/live-findings";
import { ProblemList } from "../validation/problem-list";
import { DownloadButton } from "../export/download-button";
import { SceneWorkspace } from "../canvas/editor-workspace";
import { createEditorState, editorReducer } from "../state/editor-state";
import { SceneList } from "../workspace/scene-list";
import type { FramesFolder } from "../scenes/rotation-folder";
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
  /** Frames folders under rotations/ (with frame sizes) and .glb files under models/, for adding premium scenes. */
  rotations?: readonly FramesFolder[];
  models?: readonly string[];
  /** Rows of the units source, for the live checks; undefined when it could not be read. */
  units?: readonly UnitRow[];
  /** Project-relative paths of files that exist, for the live checks. */
  existingFiles?: readonly string[];
  /** Node names of each model-3d scene's model (read on the server), by model path. */
  modelNodeNames?: Readonly<Record<string, readonly string[]>>;
}

export function EditorSession({ config, initialSceneId, editorPath, fileBaseUrl, unitCodes, images, rotations, models, units, existingFiles = [], modelNodeNames = {} }: EditorSessionProps) {
  const [state, dispatch] = useReducer(editorReducer, config, createEditorState);
  const [openId, setOpenId] = useState(initialSceneId);
  // A problem link selects its hotspot: remount the workspace with that selection.
  const [focus, setFocus] = useState<{ hotspotId?: string; n: number }>({ n: 0 });
  const files = useMemo(() => new Set(existingFiles), [existingFiles]);
  // Deferred so dragging a vertex stays smooth while the checks catch up.
  const checkedConfig = useDeferredValue(state.present.config);
  const findings = useMemo(() => liveFindings({ config: checkedConfig, units, existingFiles: files }), [checkedConfig, units, files]);
  const tree = createSceneTree(state.present.config);
  // An undo can remove the open scene (e.g. undoing "add scene"): fall back to the root.
  const sceneId = openId && tree.has(openId) ? openId : tree.root.id;
  const scene = tree.get(sceneId);

  const open = (id: string, hotspotId?: string) => {
    setOpenId(id);
    setFocus((f) => ({ hotspotId, n: f.n + 1 }));
    if (id !== sceneId) window.history.pushState(null, "", editorSceneHref(editorPath, id));
  };

  useEffect(() => {
    const onPop = () => setOpenId(sceneIdFromSearch(window.location.search));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return (
    <div className="grid flex-1 gap-6 p-6 md:grid-cols-[16rem_1fr]">
      <div className="flex flex-col gap-6">
        <SceneList scenes={editorSceneItems(state.present.config, editorPath)} selectedId={sceneId} onSelect={(id) => open(id)} />
        <ProblemList findings={findings} onOpen={open} />
        <DownloadButton config={checkedConfig} errorCount={findings.filter((f) => f.severity === "error").length} />
      </div>
      <main>
        <SceneWorkspace key={`${sceneId}#${focus.n}`} initialSelectedId={focus.hotspotId} state={state} dispatch={dispatch} sceneId={sceneId} imageUrl={`${fileBaseUrl}${scene.image.path}`} unitCodes={unitCodes} images={images} rotations={rotations} models={models} meshNames={scene.model ? modelNodeNames[scene.model.path] : undefined} />
      </main>
    </div>
  );
}
