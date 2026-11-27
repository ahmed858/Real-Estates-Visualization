// /p/<slug>/units: every unit of the project in a sortable table. A static
// segment, so it wins over /p/<slug>/<sceneId>; no scene may be called "units".
import type { Metadata } from "next";
import { Suspense } from "react";
import { loadProjectMetadata } from "../../project-metadata";
import { UnitsView } from "../../units-view";
import { projects } from "../../project-view";

export function generateMetadata(props: PageProps<"/p/[slug]/units">): Promise<Metadata> {
  return loadProjectMetadata(projects, props, "units");
}

export default function ProjectUnitsPage({ params, searchParams }: PageProps<"/p/[slug]/units">) {
  return (
    <Suspense fallback={null}>
      <UnitsView params={params} searchParams={searchParams} />
    </Suspense>
  );
}
