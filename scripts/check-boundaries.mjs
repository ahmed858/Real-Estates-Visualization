// Enforces module boundaries under src/modules (see docs/ARCHITECTURE.md).
// Rules:
//   1. A module may import another module only through its public index ("@/modules/<name>").
//   2. A module may import only the modules listed for it in ALLOWED.
//   3. Relative imports must not escape the importing module's folder.
//   4. Code outside src/modules (e.g. src/app) may import modules only through their public index.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const ALLOWED = {
  schema: [],
  domain: ["schema"],
  "data-sources": ["schema", "domain"],
  viewer: ["schema", "domain"],
  editor: ["schema", "domain", "viewer"],
  tools: ["schema", "domain", "data-sources"],
};

const IMPORT_RE = /(?:import|export)\s[^"'`]*?from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)|^\s*import\s*["']([^"']+)["']/gm;

/** Returns the import specifiers used in a source file. */
export function extractImports(source) {
  // Drop comments so documentation that mentions import paths is not scanned.
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  const out = [];
  for (const m of code.matchAll(IMPORT_RE)) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}

/** Returns the module name a path belongs to, or null if it is outside src/modules. */
function moduleOf(absPath, modulesDir) {
  const rel = relative(modulesDir, absPath);
  if (rel.startsWith("..")) return null;
  return rel.split(sep)[0];
}

/**
 * Checks one file's imports. `file` is absolute; `srcDir` is the absolute src folder.
 * Returns a list of human-readable violations.
 */
export function checkFile(file, source, srcDir) {
  const modulesDir = join(srcDir, "modules");
  const self = moduleOf(file, modulesDir);
  const errors = [];
  for (const spec of extractImports(source)) {
    let target = null;
    let viaIndex = false;
    if (spec.startsWith("@/modules/")) {
      const parts = spec.slice("@/modules/".length).split("/");
      target = parts[0];
      viaIndex = parts.length === 1;
    } else if (spec.startsWith(".")) {
      const abs = resolve(dirname(file), spec);
      const targetModule = moduleOf(abs, modulesDir);
      if (self && targetModule !== self) {
        errors.push(`${spec}: relative import escapes module "${self}"; use "@/modules/<name>"`);
        continue;
      }
      if (!self && targetModule) {
        errors.push(`${spec}: import modules via "@/modules/${targetModule}", not a relative path`);
      }
      continue;
    } else {
      continue;
    }
    if (target === self) {
      errors.push(`${spec}: a module must use relative imports for its own files`);
      continue;
    }
    if (!viaIndex) errors.push(`${spec}: deep import; use the public index "@/modules/${target}"`);
    if (self && !(ALLOWED[self] ?? []).includes(target)) {
      errors.push(`${spec}: module "${self}" may not depend on "${target}"`);
    }
    if (!(target in ALLOWED)) errors.push(`${spec}: unknown module "${target}"; register it in ALLOWED`);
  }
  return errors;
}

function walk(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) files.push(...walk(p));
    else if (/\.(ts|tsx|mts|js|mjs)$/.test(name)) files.push(p);
  }
  return files;
}

function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const srcDir = join(root, "src");
  const modulesDir = join(srcDir, "modules");
  let failed = false;
  for (const name of readdirSync(modulesDir)) {
    if (!(name in ALLOWED)) {
      console.error(`src/modules/${name}: unknown module; register it in scripts/check-boundaries.mjs`);
      failed = true;
    }
  }
  for (const file of walk(srcDir)) {
    for (const e of checkFile(file, readFileSync(file, "utf8"), srcDir)) {
      console.error(`${relative(root, file)}: ${e}`);
      failed = true;
    }
  }
  if (failed) process.exit(1);
  console.log("Module boundaries OK");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
