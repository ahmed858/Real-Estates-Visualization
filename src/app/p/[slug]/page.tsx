// /p/<slug>: the project's root scene. Data is read per request (unit status
// changes), so the view streams inside a Suspense boundary.
import { Suspense } from "react";
import { ProjectView } from "../project-view";

export default function ProjectRootPage({ params }: PageProps<"/p/[slug]">) {
  return (
    <Suspense fallback={null}>
      <ProjectView params={params} />
    </Suspense>
  );
}
