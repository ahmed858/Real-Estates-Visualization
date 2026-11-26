// Public entry point of the `editor` module.
// Internal tool for drawing unit shapes on real client images.
// Other modules may import ONLY from "@/modules/editor" (this file), never from files inside it.
export { EDITOR_ENABLED_ENV, isEditorEnabled } from "./access/editor-access";
export { SceneList } from "./workspace/scene-list";
export type { EditorSceneItem, SceneListProps } from "./workspace/scene-list";
export { ScenePreview } from "./workspace/scene-preview";
export type { ScenePreviewProps } from "./workspace/scene-preview";
export { applyCommand } from "./state/commands";
export type { DraftShape, EditorCommand, EditorDocument } from "./state/commands";
export { canRedo, canUndo, createEditorState, editorReducer } from "./state/editor-state";
export type { EditorAction, EditorState } from "./state/editor-state";
export { DrawingCanvas, UNSET_TARGET } from "./canvas/drawing-canvas";
export type { DrawingCanvasProps } from "./canvas/drawing-canvas";
export { EditorWorkspace } from "./canvas/editor-workspace";
export type { EditorWorkspaceProps } from "./canvas/editor-workspace";
export { imagePixels, nextHotspotId, toImagePoint } from "./canvas/image-point";
export type { ScreenBox } from "./canvas/image-point";
export { TargetPicker } from "./targets/target-picker";
export type { TargetPickerProps } from "./targets/target-picker";
export { hotspotIds, makeTarget, suffixOf, suggestHotspotId, targetOptions, toId } from "./targets/target-options";
export type { CodeOption, SceneOption, TargetKind, TargetOptions } from "./targets/target-options";
export { AddSceneForm } from "./scenes/add-scene-form";
export type { AddSceneFormProps } from "./scenes/add-scene-form";
export { buildScene } from "./scenes/build-scene";
export type { BuildSceneResult, SceneFormInput } from "./scenes/build-scene";
