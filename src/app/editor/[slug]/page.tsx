// /editor/<slug>: internal drawing tool, 404 unless EDITOR_ENABLED=true.
import { Suspense } from "react";
import { EditorView } from "../editor-view";

export default function EditorPage({ params, searchParams }: PageProps<"/editor/[slug]">) {
  return (
    <Suspense fallback={null}>
      <EditorView params={params} searchParams={searchParams} />
    </Suspense>
  );
}
