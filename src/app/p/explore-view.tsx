// Server view of /p/<slug>/explore: the globe intro above the project's root
// scene. Projects without a location have no globe and open their root scene.
import { notFound, redirect } from "next/navigation";
import { createSceneTree, parseGlobeStage } from "@/modules/domain";
import { GLOBE_STAGE_PARAM, GlobeIntro, LANG_PARAM, resolveLocale, TOUR_PARAM, ViewerMessage, withLocale } from "@/modules/viewer";
import { projectPageState } from "./project-page-state";
import { projectFileUrl, projects, type ProjectViewProps } from "./project-view";

/** The Natural Earth country shapes the globe draws (see public/globe/README.md). */
export const GLOBE_SHAPES_URL = "/globe/countries-110m.json";

export async function ExploreView({ params, searchParams }: ProjectViewProps) {
  const { slug } = await params;
  const query = await searchParams;
  const state = await projectPageState(slug, projects);
  if (state.kind === "not-found") notFound();
  if (state.kind === "invalid") return <ViewerMessage title={`Project "${slug}" has invalid data`} details={state.issues} />;
  const { config } = state.project;
  const defaultLocale = config.project.defaultLocale;
  const locale = resolveLocale(query[LANG_PARAM], defaultLocale);
  const where = config.project.location;
  if (!where) redirect(withLocale(`/p/${slug}`, locale, defaultLocale));
  const root = createSceneTree(config).root;
  return (
    <GlobeIntro
      locale={locale}
      defaultLocale={defaultLocale}
      projectName={config.project.name[locale]}
      logoUrl={projectFileUrl(slug, config.project.branding.logo)}
      location={{
        lat: where.lat,
        lng: where.lng,
        country: where.country?.[locale],
        city: where.city?.[locale],
        nearby: (where.nearby ?? []).map((n) => ({ name: n.name[locale], minutes: n.minutes })),
      }}
      posterUrl={projectFileUrl(slug, root.image.path)}
      initialStage={parseGlobeStage(query[GLOBE_STAGE_PARAM])}
      enterHref={withLocale(`/p/${slug}`, locale, defaultLocale)}
      tourHref={withLocale(`/p/${slug}?${TOUR_PARAM}=1`, locale, defaultLocale)}
      shapesUrl={GLOBE_SHAPES_URL}
      brand={{ primary: config.project.branding.primaryColor, accent: config.project.branding.accentColor }}
    />
  );
}
