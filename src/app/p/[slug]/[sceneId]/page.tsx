// /p/<slug>/<sceneId>: one scene of the project.
import { Suspense } from "react";
import { ProjectView } from "../../project-view";

export default function ProjectScenePage({ params }: PageProps<"/p/[slug]/[sceneId]">) {
  return (
    <Suspense fallback={null}>
      <ProjectView params={params} />
    </Suspense>
  );
}
