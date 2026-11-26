// `npm run validate -- <slug>`: validates projects/<slug>/ and prints a report.
// Exits 1 when there are errors, 0 when there are only warnings or nothing.
import { join } from "node:path";
import { errorsOf, formatReport } from "./report";
import { validateProject } from "./validate-project";

export async function runValidateCli(args: readonly string[], projectsDir: string): Promise<number> {
  const slug = args[0];
  if (!slug) {
    console.error("Usage: npm run validate -- <project-slug>");
    return 2;
  }
  const report = await validateProject(join(projectsDir, slug));
  console.log(formatReport(report));
  return errorsOf(report).length > 0 ? 1 : 0;
}
