// Server view shared by /p/<slug> (root scene) and /p/<slug>/<sceneId>.
// Loads the project through the ProjectSource interface and composes the
// viewer layout from plain data.
import { join } from "node:path";
import { notFound } from "next/navigation";
import { FileProjectSource, ProjectSourceError, type LoadedProject } from "@/modules/data-sources";
import { computeSceneStats, createSceneTree } from "@/modules/domain";
import type { UnitStatus } from "@/modules/schema";
import { ProjectHeader, SceneStage, ScenePanel, StatusLegend, ViewerLayout, ViewerMessage, viewerText } from "@/modules/viewer";

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
  const stats = computeSceneStats(tree, units).get(scene.id);

  const unitStatus: Record<string, UnitStatus> = Object.fromEntries(units.map((u) => [u.code, u.status]));
  const sceneTitles = Object.fromEntries(tree.scenes.map((s) => [s.id, s.title[locale]]));
  const name = config.project.name[locale];

  return (
    <ViewerLayout
      locale={locale}
      brand={{ primary: config.project.branding.primaryColor, accent: config.project.branding.accentColor }}
      header={<ProjectHeader name={name} logoUrl={projectFileUrl(slug, config.project.branding.logo)} text={text} />}
      scene={<SceneStage scene={scene} imageUrl={projectFileUrl(slug, scene.image.path)} unitStatus={unitStatus} sceneTitles={sceneTitles} locale={locale} />}
      legend={<StatusLegend text={text} counts={stats?.byStatus} />}
      panel={<ScenePanel sceneTitle={scene.title[locale]} text={text} />}
    />
  );
}
