// Page title, description, icon and link-preview image for a project's pages,
// so a link shared on WhatsApp shows the client's project and logo instead of
// "Unit Explorer". Unknown projects or scenes keep the site defaults.
import type { Metadata } from "next";
import { ProjectSourceError, type ProjectSource } from "@/modules/data-sources";
import { createSceneTree } from "@/modules/domain";
import type { ProjectConfig } from "@/modules/schema";
import { LANG_PARAM, resolveLocale, viewerText, type ViewerLocale } from "@/modules/viewer";
import { projectFileUrl } from "./project-view";

export type ProjectPage = { kind: "scene"; sceneId?: string } | { kind: "units" } | { kind: "compare" };

/** Metadata for one page of a project; undefined when the scene does not exist. */
export function projectMetadata(config: ProjectConfig, page: ProjectPage, locale: ViewerLocale): Metadata | undefined {
  const { slug, name: names, branding } = config.project;
  const tree = createSceneTree(config);
  const name = names[locale];
  const text = viewerText(locale);
  let title = name;
  if (page.kind === "units") title = `${text.table.title} · ${name}`;
  else if (page.kind === "compare") title = `${text.compare.title} · ${name}`;
  else if (page.sceneId !== undefined) {
    if (!tree.has(page.sceneId)) return undefined;
    if (page.sceneId !== tree.root.id) title = `${tree.get(page.sceneId).title[locale]} · ${name}`;
  }
  const description = text.metaDescription(name);
  const { image } = tree.root;
  return {
    title,
    description,
    icons: { icon: projectFileUrl(slug, branding.logo) },
    openGraph: {
      type: "website",
      title,
      description,
      siteName: name,
      images: [{ url: projectFileUrl(slug, image.path), width: image.width, height: image.height, alt: tree.root.title[locale] }],
    },
  };
}

export interface MetadataRequest {
  params: Promise<{ slug: string; sceneId?: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Loads the project and builds its metadata; falls back to the site defaults when it cannot. */
export async function loadProjectMetadata(source: ProjectSource, { params, searchParams }: MetadataRequest, kind: ProjectPage["kind"]): Promise<Metadata> {
  const { slug, sceneId } = await params;
  const query = await searchParams;
  try {
    const { config } = await source.load(slug);
    const locale = resolveLocale(query[LANG_PARAM], config.project.defaultLocale);
    return projectMetadata(config, kind === "scene" ? { kind, sceneId } : { kind }, locale) ?? {};
  } catch (e) {
    if (e instanceof ProjectSourceError) return {};
    throw e;
  }
}
