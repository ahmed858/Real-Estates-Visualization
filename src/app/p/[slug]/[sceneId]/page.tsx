// /p/<slug>/<sceneId>: one scene of the project.
import type { Metadata } from "next";
import { Suspense } from "react";
import { loadProjectMetadata } from "../../project-metadata";
import { ProjectView, projects } from "../../project-view";

export function generateMetadata(props: PageProps<"/p/[slug]/[sceneId]">): Promise<Metadata> {
  return loadProjectMetadata(projects, props, "scene");
}

export default function ProjectScenePage({ params, searchParams }: PageProps<"/p/[slug]/[sceneId]">) {
  return (
    <Suspense fallback={null}>
      <ProjectView params={params} searchParams={searchParams} />
    </Suspense>
  );
}
