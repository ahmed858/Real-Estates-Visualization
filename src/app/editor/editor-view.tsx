// Server view of /editor/<slug>: the scene list and a read-only preview of the
// selected scene (?scene=<id>, default the root) on the drawing canvas.
// Internal tool, English only.
import { notFound } from "next/navigation";
import { createSceneTree } from "@/modules/domain";
import { EditorWorkspace, SceneList, type EditorSceneItem } from "@/modules/editor";
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
  const selectedId = typeof sceneParam === "string" && tree.has(sceneParam) ? sceneParam : tree.root.id;
  const scene = tree.get(selectedId);
  const items: EditorSceneItem[] = tree.scenes.map((s) => ({
    id: s.id,
    title: s.title.en,
    depth: tree.breadcrumbs(s.id).length - 1,
    href: `/editor/${slug}?scene=${encodeURIComponent(s.id)}`,
    hotspotCount: s.hotspots.length,
  }));

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-zinc-950 text-zinc-100" lang="en" dir="ltr">
      <header className="border-b border-white/10 px-6 py-3">
        <h1 className="text-lg font-semibold">Editor · {state.project.config.project.name.en}</h1>
      </header>
      <div className="grid flex-1 gap-6 p-6 md:grid-cols-[16rem_1fr]">
        <SceneList scenes={items} selectedId={selectedId} />
        <main>
          <EditorWorkspace key={selectedId} config={state.project.config} sceneId={selectedId} imageUrl={projectFileUrl(slug, scene.image.path)} unitCodes={state.project.units.map((u) => u.code)} />
        </main>
      </div>
    </div>
  );
}
