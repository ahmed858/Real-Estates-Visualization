// Server view of /editor/<slug>: loads the project, its unit codes and image
// sizes, then hands them to the client editing session, which opens the scene
// from ?scene=<id> (default the root) and keeps edits across scenes.
// Internal tool, English only.
import { join } from "node:path";
import { notFound } from "next/navigation";
import { listProjectImages } from "@/modules/data-sources";
import { createSceneTree } from "@/modules/domain";
import { EditorSession } from "@/modules/editor";
import { ViewerMessage } from "@/modules/viewer";
import { projectFileUrl, projects } from "../p/project-view";
import { editorPageState } from "./editor-page-state";

export interface EditorViewProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function EditorView({ params, searchParams }: EditorViewProps) {
  const { slug } = await params;
  const { scene: sceneParam } = await searchParams;
  const state = await editorPageState(slug, process.env, projects);
  if (state.kind === "not-found") notFound();
  if (state.kind === "invalid") return <ViewerMessage title={`Project "${slug}" has invalid data`} details={state.issues} />;

  const tree = createSceneTree(state.project.config);
  const images = await listProjectImages(join(process.cwd(), "projects"), slug);
  const initialSceneId = typeof sceneParam === "string" && tree.has(sceneParam) ? sceneParam : tree.root.id;

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-zinc-950 text-zinc-100" lang="en" dir="ltr">
      <header className="border-b border-white/10 px-6 py-3">
        <h1 className="text-lg font-semibold">Editor · {state.project.config.project.name.en}</h1>
      </header>
      <EditorSession
        config={state.project.config}
        initialSceneId={initialSceneId}
        editorPath={`/editor/${slug}`}
        fileBaseUrl={projectFileUrl(slug, "")}
        unitCodes={state.project.units.map((u) => u.code)}
        images={images}
      />
    </div>
  );
}
