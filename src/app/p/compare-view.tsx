// Server view of /p/<slug>/compare?units=A,B,C: up to three units side by side.
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSceneTree } from "@/modules/domain";
import { brandStyle, COMPARE_PARAM, CompareTable, FLOOR_PARAM, LANG_PARAM, LocaleSwitch, ProjectHeader, StaleDataNote, UNIT_PARAM, ViewerMessage, resolveLocale, viewerText, withLocale } from "@/modules/viewer";
import { compareRows } from "./compare-rows";
import { projectPageState } from "./project-page-state";
import { projectFileUrl, projects, sceneUrl, type ProjectViewProps } from "./project-view";

export async function CompareView({ params, searchParams }: ProjectViewProps) {
  const { slug } = await params;
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
  const name = config.project.name[locale];
  const rows = compareRows({
    tree,
    units,
    param: query[COMPARE_PARAM],
    locale,
    projectName: name,
    whatsapp: config.project.contact.whatsapp,
    hrefOf: (sceneId, code, floor) => {
      const search = new URLSearchParams({ [UNIT_PARAM]: code, ...(floor !== undefined && { [FLOOR_PARAM]: String(floor) }) });
      return withLocale(`${sceneUrl(slug, sceneId, tree.root.id)}?${search}`, locale, defaultLocale);
    },
    fileUrl: (path) => projectFileUrl(slug, path),
  });
  const style = brandStyle({ primary: config.project.branding.primaryColor, accent: config.project.branding.accentColor });

  return (
    <div lang={locale} dir={text.dir} style={style} className="flex min-h-screen flex-1 flex-col bg-zinc-950 text-zinc-100">
      <ProjectHeader name={name} logoUrl={projectFileUrl(slug, config.project.branding.logo)} text={text} actions={<LocaleSwitch locale={locale} defaultLocale={defaultLocale} />} />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">{text.compare.title}</h2>
          <Link href={withLocale(`/p/${slug}/units`, locale, defaultLocale)} className="text-sm text-zinc-300 underline-offset-2 hover:text-white hover:underline">
            {text.table.link}
          </Link>
        </div>
        {project.unitsStale && <StaleDataNote text={text} />}
        {rows.length > 0 ? <CompareTable units={rows} currency={config.project.currency} locale={locale} /> : <p className="text-zinc-400">{text.compare.empty}</p>}
      </main>
    </div>
  );
}
