import { ProjectDirectory } from "./project-directory";
import { projectFileUrl, projects } from "./p/project-view";

// Home page: a card per published project. Projects are committed files, so
// the list is cached and only changes with a new deployment.
async function PublishedProjects() {
  "use cache";
  return <ProjectDirectory projects={await projects.list()} fileUrl={projectFileUrl} />;
}

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center gap-6 p-8 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Unit Explorer</h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        Interactive floor plan visualization for real estate projects.
      </p>
      <PublishedProjects />
    </main>
  );
}
