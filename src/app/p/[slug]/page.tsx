// /p/<slug>: the project's root scene. Data is read per request (unit status
// changes), so the view streams inside a Suspense boundary.
import type { Metadata } from "next";
import { Suspense } from "react";
import { loadProjectMetadata } from "../project-metadata";
import { ProjectView, projects } from "../project-view";

export function generateMetadata(props: PageProps<"/p/[slug]">): Promise<Metadata> {
  return loadProjectMetadata(projects, props, "scene");
}

export default function ProjectRootPage({ params, searchParams }: PageProps<"/p/[slug]">) {
  return (
    <Suspense fallback={null}>
      <ProjectView params={params} searchParams={searchParams} />
    </Suspense>
  );
}
