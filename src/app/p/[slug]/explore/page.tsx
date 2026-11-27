// /p/<slug>/explore: the globe intro (earth → country → city → project) that
// leads into the project. A static segment, so it wins over /p/<slug>/<sceneId>;
// the schema keeps "explore" out of scene ids.
import type { Metadata } from "next";
import { Suspense } from "react";
import { ExploreView } from "../../explore-view";
import { loadProjectMetadata } from "../../project-metadata";
import { projects } from "../../project-view";

export function generateMetadata(props: PageProps<"/p/[slug]/explore">): Promise<Metadata> {
  return loadProjectMetadata(projects, props, "scene");
}

export default function ProjectExplorePage({ params, searchParams }: PageProps<"/p/[slug]/explore">) {
  return (
    <Suspense fallback={null}>
      <ExploreView params={params} searchParams={searchParams} />
    </Suspense>
  );
}
