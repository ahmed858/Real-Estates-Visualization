// Server view shared by /p/<slug> (root scene) and /p/<slug>/<sceneId>.
// Loads the project through the ProjectSource interface and composes the
// viewer layout from plain data.
import { join } from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileProjectSource, LEAD_WEBHOOKS_ENV, parseLeadWebhooks } from "@/modules/data-sources";
import { computeBedroomMix, computeSceneStats, createSceneTree, guidedTour, guidedTourStep, premiumViews, rollUpUnits, type FilterableUnit, type SceneTree } from "@/modules/domain";
import { projectPageState, visitorProjectSource } from "./project-page-state";
import { Breadcrumbs, FloorPicker, SceneViews, type SceneViewLink, LANG_PARAM, LocaleSwitch, ProjectHeader, resolveLocale, withLocale, SceneFilter, SceneStage, type SceneSummary, type SceneTourStep, FLOOR_PARAM, GLOBE_STAGE_PARAM, globeText, TOUR_PARAM, type ViewerLocale, type UnitSummary, SidePanel, mapsSearchUrl, StaleDataNote, StatusLegend, ViewerLayout, ViewerMessage, viewerText, WhatsAppButton, enquiryMessage, whatsappLink } from "@/modules/viewer";

/** Every project on disk, hidden ones included (the editor reads this). */
export const allProjects = new FileProjectSource(join(process.cwd(), "projects"));
/** What visitors may open: hidden projects are not found unless PREVIEW_PROJECTS=true. */
export const projects = visitorProjectSource(allProjects, process.env);
/** Projects with a lead webhook show the lead form; the URLs stay on the server. Warnings are logged by the lead route. */
const leadSlugs = new Set(parseLeadWebhooks(process.env[LEAD_WEBHOOKS_ENV]).keys());

export const projectFileUrl = (slug: string, path: string) => `/files/${slug}/${path}`;

/** The root scene lives at /p/<slug>; every other scene at /p/<slug>/<sceneId>. */
export const sceneUrl = (slug: string, sceneId: string, rootId: string) => (sceneId === rootId ? `/p/${slug}` : `/p/${slug}/${sceneId}`);

/** What the guided tour does on this scene, when ?tour=1 is on and the scene is on the tour's path. */
export function tourStepFor(
  tree: SceneTree,
  units: readonly { code: string; status: "available" | "reserved" | "sold" }[],
  sceneId: string,
  hrefOf: (sceneId: string, query?: Record<string, string>) => string,
): SceneTourStep | undefined {
  const tour = guidedTour(tree, units);
  const step = tour && guidedTourStep(tree, tour, sceneId);
  if (!tour || !step) return undefined;
  if (step.kind === "unit") return { kind: "unit", hotspotId: step.hotspotId, code: step.code, ...(step.viewSceneId && { viewHref: hrefOf(step.viewSceneId) }) };
  // A typical floor shows the tour's unit only on the tour's floor.
  const query: Record<string, string> = { [TOUR_PARAM]: "1" };
  if (step.sceneId === tour.scenes.at(-1) && tour.unit.floor !== undefined) query[FLOOR_PARAM] = String(tour.unit.floor);
  return { kind: "scene", hotspotId: step.hotspotId, href: hrefOf(step.sceneId, query) };
}

/** The breadcrumb that leads back up to the globe intro, for projects with a location. */
export function globeCrumb(slug: string, locale: ViewerLocale, defaultLocale: ViewerLocale) {
  return { id: "globe", title: globeText(locale).crumb, href: withLocale(`/p/${slug}/explore?${GLOBE_STAGE_PARAM}=site`, locale, defaultLocale) };
}

export interface ProjectViewParams {
  slug: string;
  sceneId?: string;
}

export interface ProjectViewProps {
  params: Promise<ProjectViewParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function ProjectView({ params, searchParams }: ProjectViewProps) {
  const { slug, sceneId } = await params;
  const query = await searchParams;
  const state = await projectPageState(slug, projects);
  if (state.kind === "not-found") notFound();
  if (state.kind === "invalid") return <ViewerMessage title={`Project "${slug}" has invalid data`} details={state.issues} />;
  const project = state.project;

  const { config, units } = project;
  const defaultLocale = config.project.defaultLocale;
  const locale = resolveLocale(query[LANG_PARAM], defaultLocale);
  const text = viewerText(locale);
  const tree = createSceneTree(config);
  if (sceneId !== undefined && !tree.has(sceneId)) notFound();
  const scene = tree.get(sceneId ?? tree.root.id);
  const allStats = computeSceneStats(tree, units);
  const stats = allStats.get(scene.id);

  const floors = tree.concreteFloors(scene.id).map((f) => ({ floor: f.floor, codes: Object.fromEntries(f.units.map((u) => [u.hotspotId, u.code])) }));
  const drawn = new Set([
    ...scene.hotspots.flatMap((h) => ("unit" in h.target ? [h.target.unit] : [])),
    ...floors.flatMap((f) => Object.values(f.codes)),
  ]);
  const sceneHrefs = Object.fromEntries(tree.scenes.map((s) => [s.id, withLocale(sceneUrl(slug, s.id, tree.root.id), locale, defaultLocale)]));
  const toursOf = (code: string) => tree.scenes.filter((s) => s.showsUnits?.includes(code)).map((s) => ({ title: s.title[locale], href: sceneHrefs[s.id] }));
  const sceneUnits: Record<string, UnitSummary> = Object.fromEntries(
    units
      .filter((u) => drawn.has(u.code))
      .map(({ code, type, floor, bedrooms, bathrooms, areaM2, price, status, planImage, gallery, notes }) => [
        code,
        {
          code, type, floor, bedrooms, bathrooms, areaM2, price, status,
          ...(planImage && { planImageUrl: projectFileUrl(slug, planImage) }),
          ...(gallery && { galleryUrls: gallery.map((path) => projectFileUrl(slug, path)) }),
          ...(notes && { notes }),
          ...(toursOf(code).length > 0 && { tours: toursOf(code) }),
        },
      ]),
  );
  const bedroomMix = computeBedroomMix(tree, units);
  // Units below each scene hotspot of this scene, for the filter counts, and
  // every unit of the project, for the filter options. Only the filtered fields.
  const rolledUp = rollUpUnits(tree, units);
  const filterable = (rows: readonly FilterableUnit[] = []): FilterableUnit[] => rows.map(({ status, type, bedrooms, floor, price, areaM2 }) => ({ status, type, bedrooms, floor, price, areaM2 }));
  const unitsBelow = Object.fromEntries(scene.hotspots.flatMap((h) => ("scene" in h.target ? [[h.target.scene, filterable(rolledUp.get(h.target.scene))]] : [])));
  const projectUnits = filterable(rolledUp.get(tree.root.id));
  const sceneSummaries: Record<string, SceneSummary> = Object.fromEntries(
    [...allStats].map(([id, s]) => [id, { total: s.total, byStatus: s.byStatus, bedroomMix: bedroomMix.get(id) ?? [], price: s.price, area: s.area }]),
  );
  const sceneTitles = Object.fromEntries(tree.scenes.map((s) => [s.id, s.title[locale]]));
  const views = premiumViews(tree, scene.id).flatMap((s): SceneViewLink[] => (s.type === "image-2d" ? [] : [{ id: s.id, title: s.title[locale], href: sceneHrefs[s.id], type: s.type }]));
  const where = config.project.location;
  const crumbs = [
    ...(where ? [globeCrumb(slug, locale, defaultLocale)] : []),
    ...tree.breadcrumbs(scene.id).map((s) => ({ id: s.id, title: s.title[locale], href: sceneHrefs[s.id] })),
  ];
  const tour =
    query[TOUR_PARAM] === "1"
      ? tourStepFor(tree, units, scene.id, (id, extra) => {
          const href = sceneUrl(slug, id, tree.root.id);
          return withLocale(extra ? `${href}?${new URLSearchParams(extra)}` : href, locale, defaultLocale);
        })
      : undefined;
  const name = config.project.name[locale];
  const location = where && scene.id === tree.root.id ? { address: where.address[locale], mapsHref: mapsSearchUrl(where) } : undefined;

  return (
    <ViewerLayout
      locale={locale}
      brand={{ primary: config.project.branding.primaryColor, accent: config.project.branding.accentColor }}
      header={<ProjectHeader name={name} logoUrl={projectFileUrl(slug, config.project.branding.logo)} text={text} actions={
            <>
              <WhatsAppButton href={whatsappLink(config.project.contact.whatsapp, enquiryMessage(text, { projectName: name }))} label={text.contact.button} variant="outline" />
              <Link href={withLocale(`/p/${slug}/units`, locale, defaultLocale)} className="rounded-md px-3 py-1.5 text-sm font-medium text-white hover:bg-white/10">
                {text.table.link}
              </Link>
              <LocaleSwitch locale={locale} defaultLocale={defaultLocale} />
            </>
          } />}
      nav={
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Breadcrumbs items={crumbs} label={text.breadcrumbs} />
          <SceneViews views={views} currentId={scene.id} text={text} />
          {floors.length > 0 && <FloorPicker floors={floors.map((f) => f.floor)} locale={locale} />}
          <SceneFilter units={projectUnits} locale={locale} />
          {project.unitsStale && <StaleDataNote text={text} />}
        </div>
      }
      scene={<SceneStage scene={scene} imageUrl={projectFileUrl(slug, scene.image.path)} units={sceneUnits} sceneTitles={sceneTitles} sceneSummaries={sceneSummaries} sceneUnits={unitsBelow} sceneHrefs={sceneHrefs} floors={floors} currency={config.project.currency} locale={locale} tour={tour} />}
      legend={<StatusLegend text={text} counts={stats?.byStatus} />}
      panel={<SidePanel sceneTitle={scene.title[locale]} stats={stats} units={sceneUnits} currency={config.project.currency} locale={locale} enquiry={{ whatsapp: config.project.contact.whatsapp, projectName: name, typicalFloor: floors.length > 0 }} unitsHref={withLocale(`/p/${slug}/units`, locale, defaultLocale)} location={location} leadSlug={leadSlugs.has(slug) ? slug : undefined} />}
    />
  );
}
