// Server view of /editor/<slug>: loads the project, its unit codes and image
// sizes, then hands them to the client editing session, which opens the scene
// from ?scene=<id> (default the root) and keeps edits across scenes.
// Internal tool, English only.
import { access } from "node:fs/promises";
import { join } from "node:path";
import { notFound } from "next/navigation";
import { listProjectImages } from "@/modules/data-sources";
import { createSceneTree, referencedFiles } from "@/modules/domain";
import { EditorSession } from "@/modules/editor";
import { ViewerMessage } from "@/modules/viewer";
import { allProjects, projectFileUrl } from "../p/project-view";
import { editorPageState } from "./editor-page-state";

export interface EditorViewProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function EditorView({ params, searchParams }: EditorViewProps) {
  const { slug } = await params;
  const { scene: sceneParam } = await searchParams;
  const state = await editorPageState(slug, process.env, allProjects);
  if (state.kind === "not-found") notFound();
  if (state.kind === "invalid") return <ViewerMessage title={`Project "${slug}" has invalid data`} details={state.issues} />;

  const tree = createSceneTree(state.project.config);
  const projectDir = join(process.cwd(), "projects", slug);
  const images = await listProjectImages(join(process.cwd(), "projects"), slug);
  // Files the live checks may ask about: every image, plus whatever the saved project refers to.
  const referenced = referencedFiles(state.project.config, tree, state.project.units).map((r) => r.path);
  const present = await Promise.all(referenced.map((p) => access(join(projectDir, p)).then(() => p, () => undefined)));
  const existingFiles = [...new Set([...images.map((i) => i.path), ...present.filter((p): p is string => p !== undefined)])];
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
        units={state.project.units}
        existingFiles={existingFiles}
      />
    </div>
  );
}
