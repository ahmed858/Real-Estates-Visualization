// /p/<slug>/compare?units=A,B,C: units side by side. A static segment, so it
// wins over /p/<slug>/<sceneId>; no scene may be called "compare".
import type { Metadata } from "next";
import { Suspense } from "react";
import { CompareView } from "../../compare-view";
import { loadProjectMetadata } from "../../project-metadata";
import { projects } from "../../project-view";

export function generateMetadata(props: PageProps<"/p/[slug]/compare">): Promise<Metadata> {
  return loadProjectMetadata(projects, props, "compare");
}

export default function ProjectComparePage({ params, searchParams }: PageProps<"/p/[slug]/compare">) {
  return (
    <Suspense fallback={null}>
      <CompareView params={params} searchParams={searchParams} />
    </Suspense>
  );
}
