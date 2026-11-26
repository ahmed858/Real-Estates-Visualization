// Entry for `npm run generate:demo` (run with tsx): writes projects/demo-villa/.
import { join } from "node:path";
import { buildDemoVillaProject, DEMO_SLUG, writeProjectFiles } from "@/modules/tools";

const dir = join(process.cwd(), "projects", DEMO_SLUG);
const files = buildDemoVillaProject();
writeProjectFiles(dir, files).then(() => {
  console.log(`Wrote ${files.size} files to projects/${DEMO_SLUG}/`);
});
