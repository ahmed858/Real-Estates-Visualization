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
