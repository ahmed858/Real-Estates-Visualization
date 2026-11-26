// Editor state with undo and redo. The state keeps the document it started
// from and the list of applied commands; undo drops the last command and
// replays the rest from the start, redo re-applies an undone command.
import type { ProjectConfig } from "@/modules/schema";
import { applyCommand, type EditorCommand, type EditorDocument } from "./commands";

export interface EditorState {
  readonly initial: EditorDocument;
  readonly present: EditorDocument;
  /** Applied commands, oldest first. */
  readonly done: readonly EditorCommand[];
  /** Undone commands, the next one to redo last. */
  readonly undone: readonly EditorCommand[];
}

export type EditorAction = { type: "do"; command: EditorCommand } | { type: "undo" } | { type: "redo" };

export function createEditorState(config: ProjectConfig): EditorState {
  const initial: EditorDocument = { config };
  return { initial, present: initial, done: [], undone: [] };
}

function replay(initial: EditorDocument, commands: readonly EditorCommand[]): EditorDocument {
  // Every recorded command applied when it was recorded, so replaying from the same start applies again.
  return commands.reduce((doc, command) => applyCommand(doc, command) ?? doc, initial);
}

export const canUndo = (state: EditorState) => state.done.length > 0;
export const canRedo = (state: EditorState) => state.undone.length > 0;

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "do": {
      const next = applyCommand(state.present, action.command);
      if (!next) return state;
      return { ...state, present: next, done: [...state.done, action.command], undone: [] };
    }
    case "undo": {
      if (!canUndo(state)) return state;
      const done = state.done.slice(0, -1);
      return { ...state, present: replay(state.initial, done), done, undone: [...state.undone, state.done[state.done.length - 1]] };
    }
    case "redo": {
      if (!canRedo(state)) return state;
      const command = state.undone[state.undone.length - 1];
      const next = applyCommand(state.present, command) ?? state.present;
      return { ...state, present: next, done: [...state.done, command], undone: state.undone.slice(0, -1) };
    }
  }
}
