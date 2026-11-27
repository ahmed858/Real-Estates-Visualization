// Decides what a visitor page of /p/<slug> shows: the project, its validation
// problems, or nothing (404) for a missing or hidden project.
import { isPreviewEnabled, ProjectSourceError, PublishedProjectSource, type LoadedProject, type ProjectSource } from "@/modules/data-sources";

export type ProjectPageState =
  | { kind: "not-found" }
  | { kind: "invalid"; issues: readonly string[] }
  | { kind: "ready"; project: LoadedProject };

/** The source visitor pages read: hidden projects answer not-found unless PREVIEW_PROJECTS=true. */
export function visitorProjectSource(all: ProjectSource, env: Readonly<Record<string, string | undefined>>): ProjectSource {
  return new PublishedProjectSource(all, { preview: isPreviewEnabled(env) });
}

export async function projectPageState(slug: string, source: ProjectSource): Promise<ProjectPageState> {
  try {
    return { kind: "ready", project: await source.load(slug) };
  } catch (e) {
    if (!(e instanceof ProjectSourceError)) throw e;
    if (e.kind === "not-found") return { kind: "not-found" };
    return { kind: "invalid", issues: e.issues };
  }
}
