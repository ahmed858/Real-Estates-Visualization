// Server view shared by /p/<slug> (root scene) and /p/<slug>/<sceneId>.
// Loads the project through the ProjectSource interface and composes the
// viewer layout from plain data.
import { join } from "node:path";
import { notFound } from "next/navigation";
import { FileProjectSource, ProjectSourceError, type LoadedProject } from "@/modules/data-sources";
import { computeBedroomMix, computeSceneStats, createSceneTree } from "@/modules/domain";
import { Breadcrumbs, FloorPicker, LANG_PARAM, LocaleSwitch, ProjectHeader, resolveLocale, withLocale, SceneStage, type SceneSummary, type UnitSummary, SidePanel, StatusLegend, ViewerLayout, ViewerMessage, viewerText } from "@/modules/viewer";

const projects = new FileProjectSource(join(process.cwd(), "projects"));

export const projectFileUrl = (slug: string, path: string) => `/files/${slug}/${path}`;

/** The root scene lives at /p/<slug>; every other scene at /p/<slug>/<sceneId>. */
export const sceneUrl = (slug: string, sceneId: string, rootId: string) => (sceneId === rootId ? `/p/${slug}` : `/p/${slug}/${sceneId}`);

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
  let project: LoadedProject;
  try {
    project = await projects.load(slug);
  } catch (e) {
    if (!(e instanceof ProjectSourceError)) throw e;
    if (e.kind === "not-found") notFound();
    return <ViewerMessage title={`Project "${slug}" has invalid data`} details={e.issues} />;
  }

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
  const sceneUnits: Record<string, UnitSummary> = Object.fromEntries(
    units
      .filter((u) => drawn.has(u.code))
      .map(({ code, type, floor, bedrooms, bathrooms, areaM2, price, status, planImage, notes }) => [
        code,
        { code, type, floor, bedrooms, bathrooms, areaM2, price, status, ...(planImage && { planImageUrl: projectFileUrl(slug, planImage) }), ...(notes && { notes }) },
      ]),
  );
  const bedroomMix = computeBedroomMix(tree, units);
  const sceneSummaries: Record<string, SceneSummary> = Object.fromEntries(
    [...allStats].map(([id, s]) => [id, { total: s.total, byStatus: s.byStatus, bedroomMix: bedroomMix.get(id) ?? [], price: s.price, area: s.area }]),
  );
  const sceneTitles = Object.fromEntries(tree.scenes.map((s) => [s.id, s.title[locale]]));
  const sceneHrefs = Object.fromEntries(tree.scenes.map((s) => [s.id, withLocale(sceneUrl(slug, s.id, tree.root.id), locale, defaultLocale)]));
  const crumbs = tree.breadcrumbs(scene.id).map((s) => ({ id: s.id, title: s.title[locale], href: sceneHrefs[s.id] }));
  const name = config.project.name[locale];

  return (
    <ViewerLayout
      locale={locale}
      brand={{ primary: config.project.branding.primaryColor, accent: config.project.branding.accentColor }}
      header={<ProjectHeader name={name} logoUrl={projectFileUrl(slug, config.project.branding.logo)} text={text} actions={<LocaleSwitch locale={locale} defaultLocale={defaultLocale} />} />}
      nav={
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Breadcrumbs items={crumbs} label={text.breadcrumbs} />
          {floors.length > 0 && <FloorPicker floors={floors.map((f) => f.floor)} locale={locale} />}
        </div>
      }
      scene={<SceneStage scene={scene} imageUrl={projectFileUrl(slug, scene.image.path)} units={sceneUnits} sceneTitles={sceneTitles} sceneSummaries={sceneSummaries} sceneHrefs={sceneHrefs} floors={floors} currency={config.project.currency} locale={locale} />}
      legend={<StatusLegend text={text} counts={stats?.byStatus} />}
      panel={<SidePanel sceneTitle={scene.title[locale]} stats={stats} units={sceneUnits} currency={config.project.currency} locale={locale} />}
    />
  );
}
