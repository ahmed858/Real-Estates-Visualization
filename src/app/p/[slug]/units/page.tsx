// /p/<slug>/units: every unit of the project in a sortable table. A static
// segment, so it wins over /p/<slug>/<sceneId>; no scene may be called "units".
import { Suspense } from "react";
import { UnitsView } from "../../units-view";

export default function ProjectUnitsPage({ params, searchParams }: PageProps<"/p/[slug]/units">) {
  return (
    <Suspense fallback={null}>
      <UnitsView params={params} searchParams={searchParams} />
    </Suspense>
  );
}
