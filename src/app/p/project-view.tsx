// Server view shared by /p/<slug> (root scene) and /p/<slug>/<sceneId>.
// Loads the project through the ProjectSource interface and composes the
// viewer layout from plain data.
import { join } from "node:path";
import { notFound } from "next/navigation";
import { FileProjectSource, ProjectSourceError, type LoadedProject } from "@/modules/data-sources";
import { computeSceneStats, createSceneTree } from "@/modules/domain";
import { ProjectHeader, SceneStage, type UnitSummary, SidePanel, StatusLegend, ViewerLayout, ViewerMessage, viewerText } from "@/modules/viewer";

const projects = new FileProjectSource(join(process.cwd(), "projects"));

export const projectFileUrl = (slug: string, path: string) => `/files/${slug}/${path}`;

export interface ProjectViewParams {
  slug: string;
  sceneId?: string;
}

export async function ProjectView({ params }: { params: Promise<ProjectViewParams> }) {
  const { slug, sceneId } = await params;
  let project: LoadedProject;
  try {
    project = await projects.load(slug);
  } catch (e) {
    if (!(e instanceof ProjectSourceError)) throw e;
    if (e.kind === "not-found") notFound();
    return <ViewerMessage title={`Project "${slug}" has invalid data`} details={e.issues} />;
  }

  const { config, units } = project;
  const locale = config.project.defaultLocale;
  const text = viewerText(locale);
  const tree = createSceneTree(config);
  if (sceneId !== undefined && !tree.has(sceneId)) notFound();
  const scene = tree.get(sceneId ?? tree.root.id);
  const allStats = computeSceneStats(tree, units);
  const stats = allStats.get(scene.id);

  const drawn = new Set(scene.hotspots.flatMap((h) => ("unit" in h.target ? [h.target.unit] : [])));
  const sceneUnits: Record<string, UnitSummary> = Object.fromEntries(
    units
      .filter((u) => drawn.has(u.code))
      .map(({ code, type, floor, bedrooms, bathrooms, areaM2, price, status, planImage, notes }) => [
        code,
        { code, type, floor, bedrooms, bathrooms, areaM2, price, status, ...(planImage && { planImageUrl: projectFileUrl(slug, planImage) }), ...(notes && { notes }) },
      ]),
  );
  const sceneCounts = Object.fromEntries([...allStats].map(([id, s]) => [id, s.byStatus]));
  const sceneTitles = Object.fromEntries(tree.scenes.map((s) => [s.id, s.title[locale]]));
  const name = config.project.name[locale];

  return (
    <ViewerLayout
      locale={locale}
      brand={{ primary: config.project.branding.primaryColor, accent: config.project.branding.accentColor }}
      header={<ProjectHeader name={name} logoUrl={projectFileUrl(slug, config.project.branding.logo)} text={text} />}
      scene={<SceneStage scene={scene} imageUrl={projectFileUrl(slug, scene.image.path)} units={sceneUnits} sceneTitles={sceneTitles} sceneCounts={sceneCounts} currency={config.project.currency} locale={locale} />}
      legend={<StatusLegend text={text} counts={stats?.byStatus} />}
      panel={<SidePanel sceneTitle={scene.title[locale]} stats={stats} units={sceneUnits} currency={config.project.currency} locale={locale} />}
    />
  );
}
