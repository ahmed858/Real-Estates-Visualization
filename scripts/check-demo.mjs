// `npm run check:demo`: regenerates projects/demo-villa, validates it, and fails
// when the committed files differ from what the generator writes.
import { execFileSync } from "node:child_process";

const DIR = "projects/demo-villa";
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const run = (cmd, args) => execFileSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32" });

run(npm, ["run", "--silent", "generate:demo"]);
run(npm, ["run", "--silent", "validate", "--", "demo-villa"]);

const changed = execFileSync("git", ["status", "--porcelain", "--", DIR], { encoding: "utf8" }).trim();
if (changed) {
  console.error(`${DIR} is out of date. Run \`npm run generate:demo\` and commit the result:\n${changed}`);
  process.exit(1);
}
console.log(`${DIR} is up to date.`);
