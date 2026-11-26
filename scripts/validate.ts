// Entry for `npm run validate -- <slug>` (run with tsx).
import { join } from "node:path";
import { runValidateCli } from "@/modules/tools";

runValidateCli(process.argv.slice(2), join(process.cwd(), "projects")).then((code) => {
  process.exitCode = code;
});
