// Home page directory: one card per published project (logo, name in the
// project's default language, link to its viewer). A project with a
// location opens with its globe intro; the others open their root scene.
import Link from "next/link";
import type { ProjectInfo } from "@/modules/schema";

export interface ProjectDirectoryProps {
  projects: readonly ProjectInfo[];
  /** URL of a project file, e.g. its logo. */
  fileUrl: (slug: string, path: string) => string;
}

export function ProjectDirectory({ projects, fileUrl }: ProjectDirectoryProps) {
  if (projects.length === 0) {
    return <p className="text-zinc-600 dark:text-zinc-400">No projects are published yet.</p>;
  }
  return (
    <ul className="grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Projects">
      {projects.map((p) => {
        const locale = p.defaultLocale;
        return (
          <li key={p.slug}>
            <Link
              href={p.location ? `/p/${p.slug}/explore` : `/p/${p.slug}`}
              lang={locale}
              dir={locale === "ar" ? "rtl" : "ltr"}
              className="flex items-center gap-4 rounded-lg border border-zinc-200 border-t-4 p-4 text-start hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              style={{ borderTopColor: p.branding.primaryColor }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fileUrl(p.slug, p.branding.logo)} alt="" width={48} height={48} className="size-12 shrink-0 object-contain" />
              <span className="font-medium">{p.name[locale]}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
