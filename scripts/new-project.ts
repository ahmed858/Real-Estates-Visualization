// Entry for `npm run new:project -- <slug> <root-image>` (run with tsx).
import { join } from "node:path";
import { runNewProjectCli } from "@/modules/tools";

runNewProjectCli(process.argv.slice(2), join(process.cwd(), "projects"), join(process.cwd(), "docs", "collection-guide", "units-template.xlsx")).then((code) => {
  process.exitCode = code;
});
