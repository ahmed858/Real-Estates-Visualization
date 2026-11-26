// Decides what /editor/<slug> shows: nothing (404) unless the editor is
// enabled, then the project or its validation problems.
import { ProjectSourceError, type LoadedProject, type ProjectSource } from "@/modules/data-sources";
import { isEditorEnabled } from "@/modules/editor";

export type EditorPageState =
  | { kind: "not-found" }
  | { kind: "invalid"; issues: readonly string[] }
  | { kind: "ready"; project: LoadedProject };

export async function editorPageState(
  slug: string,
  env: Readonly<Record<string, string | undefined>>,
  source: ProjectSource,
): Promise<EditorPageState> {
  // Off: behave exactly like a page that does not exist, without touching the project.
  if (!isEditorEnabled(env)) return { kind: "not-found" };
  try {
    return { kind: "ready", project: await source.load(slug) };
  } catch (e) {
    if (!(e instanceof ProjectSourceError)) throw e;
    if (e.kind === "not-found") return { kind: "not-found" };
    return { kind: "invalid", issues: e.issues };
  }
}
