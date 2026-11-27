// Entry for `npm run units:from-csv -- <slug> <units.csv>` (run with tsx).
import { join } from "node:path";
import { runUnitsFromCsvCli } from "@/modules/tools";

runUnitsFromCsvCli(process.argv.slice(2), join(process.cwd(), "projects")).then((code) => {
  process.exitCode = code;
});
