// Decorator over any ProjectSource: a project with `published: false` does not
// exist for visitors (not-found), unless preview is on. The editor uses the
// undecorated source, so it always sees every project.
import { isProjectPublished, type ProjectInfo } from "@/modules/schema";
import { ProjectSourceError, type LoadedProject, type ProjectSource } from "./project-source";

export const PREVIEW_PROJECTS_ENV = "PREVIEW_PROJECTS";

/** Preview of hidden projects is on only for PREVIEW_PROJECTS=true, exactly. */
export const isPreviewEnabled = (env: Readonly<Record<string, string | undefined>>): boolean => env[PREVIEW_PROJECTS_ENV] === "true";

export interface PublishedProjectSourceOptions {
  /** Also serve hidden projects (preview deployments). */
  preview: boolean;
}

export class PublishedProjectSource implements ProjectSource {
  constructor(
    private readonly inner: ProjectSource,
    private readonly options: PublishedProjectSourceOptions,
  ) {}

  async load(slug: string): Promise<LoadedProject> {
    const project = await this.inner.load(slug);
    if (!this.options.preview && !isProjectPublished(project.config.project)) throw new ProjectSourceError(slug, "not-found");
    return project;
  }

  async list(): Promise<ProjectInfo[]> {
    const all = await this.inner.list();
    return this.options.preview ? all : all.filter(isProjectPublished);
  }
}
