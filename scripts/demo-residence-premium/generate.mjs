// Generates the premium assets of projects/demo-residence: the 3D building
// (models/residence.glb), its poster, and the 360° panoramas with their
// posters. Run with `node scripts/demo-residence-premium/generate.mjs [job...]`.
// It drives the pre-installed Chromium (Playwright) with software WebGL, so
// output can differ slightly between machines; the files are committed and
// CI does not regenerate them. See projects/demo-residence/README.md.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const project = join(root, "projects/demo-residence");
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

/** Where each job's output goes, relative to the project folder. */
export const OUTPUTS = {
  model: "models/residence.glb",
  "building-poster": "images/building-3d.jpg",
  // Not a project file: the floor polygons on the poster, copied into project.json by hand.
  "floor-outlines": "../../scripts/demo-residence-premium/floor-outlines.json",
  "panorama-living-a": "panoramas/living-a.jpg",
  "poster-living-a": "images/360-living-a.jpg",
  "panorama-bedroom-b": "panoramas/bedroom-b.jpg",
  "poster-bedroom-b": "images/360-bedroom-b.jpg",
  "panorama-rooftop": "panoramas/rooftop.jpg",
  "poster-rooftop": "images/360-rooftop.jpg",
};

const TYPES = { ".js": "text/javascript", ".html": "text/html" };
const PAGE = `<!doctype html><html><head><meta charset="utf-8">
<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>
<style>body{margin:0;background:#000}</style></head><body><script type="module" src="/gen/main.js"></script></body></html>`;

async function main() {
  const wanted = process.argv.slice(2);
  const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const page = await browser.newPage();
  page.on("console", (m) => console.log(`[page] ${m.text()}`));
  page.on("pageerror", (e) => console.error(`[page error] ${e.message}`));
  await page.route("http://gen.local/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/") return route.fulfill({ body: PAGE, contentType: TYPES[".html"] });
    const file = path.startsWith("/three/") ? join(root, "node_modules", path) : path.startsWith("/gen/") ? join(here, path.slice(5)) : undefined;
    if (!file) return route.fulfill({ status: 404, body: "" });
    return route.fulfill({ body: await readFile(file), contentType: TYPES[extname(file)] ?? "application/octet-stream" });
  });
  await page.goto("http://gen.local/");
  await page.waitForFunction(() => typeof window.generate === "function");
  const jobs = wanted.length ? wanted : Object.keys(OUTPUTS);
  for (const job of jobs) {
    const started = Date.now();
    const out = await page.evaluate((j) => window.generate(j), job);
    const bytes = Buffer.from(out.replace(/^data:[^,]+,/, ""), "base64");
    const target = join(project, OUTPUTS[job]);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, bytes);
    console.log(`${OUTPUTS[job]}: ${(bytes.length / 1024).toFixed(0)} KB in ${((Date.now() - started) / 1000).toFixed(1)} s`);
  }
  await browser.close();
}

await main();
