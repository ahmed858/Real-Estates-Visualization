// `npm run new:project -- <slug> <root-image>`: starts a client project folder
// so the owner never writes the first project.json by hand. The config is
// valid from the start (the editor opens it right away) and its placeholders
// are easy to spot; `npm run validate` lists what is still missing.
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { IMAGE_CONTENT_TYPES, PROJECT_IMAGES_DIR, readImageSize } from "@/modules/data-sources";
import type { ImageSize } from "@/modules/domain";
import { parseProjectConfig, PROJECT_SCHEMA_VERSION, type ProjectConfigInput } from "@/modules/schema";

/** Values the owner replaces; all of them pass the schema so the project opens in the editor. */
export const PLACEHOLDERS = {
  nameAr: "اسم المشروع",
  whatsapp: "+200000000000",
  currency: "EGP",
  primaryColor: "#1a6b4f",
  accentColor: "#c89b3c",
} as const;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const titleCase = (slug: string) => slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

/** The starter project.json text for a project whose root image is `imagePath` (relative to the project folder). */
export function scaffoldProjectConfig(slug: string, imagePath: string, size: ImageSize): string {
  const config: ProjectConfigInput = {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    project: {
      slug,
      name: { ar: PLACEHOLDERS.nameAr, en: titleCase(slug) },
      defaultLocale: "ar",
      currency: PLACEHOLDERS.currency,
      contact: { whatsapp: PLACEHOLDERS.whatsapp },
      branding: { logo: `${PROJECT_IMAGES_DIR}/logo.svg`, primaryColor: PLACEHOLDERS.primaryColor, accentColor: PLACEHOLDERS.accentColor },
    },
    root: {
      id: "facade",
      kind: "facade",
      title: { ar: "الواجهة", en: "Facade" },
      image: { path: imagePath, width: size.width, height: size.height },
      hotspots: [],
    },
  };
  return `${JSON.stringify(config, null, 2)}\n`;
}

export class NewProjectError extends Error {}

export interface CreateProjectOptions {
  projectsDir: string;
  slug: string;
  /** The root image (facade or masterplan) anywhere on disk; it is copied into images/. */
  rootImage: string;
  /** The units sheet to start from (the collection guide's template). */
  unitsTemplate: string;
}

const exists = (path: string) => stat(path).then(() => true, () => false);

/** Creates projects/<slug>/ with images/, units.xlsx and project.json; returns the folder. */
export async function createProject({ projectsDir, slug, rootImage, unitsTemplate }: CreateProjectOptions): Promise<string> {
  if (!SLUG.test(slug)) throw new NewProjectError(`"${slug}" is not a valid slug: use lowercase letters, digits and single dashes, e.g. palm-towers`);
  const ext = extname(rootImage).toLowerCase();
  if (!IMAGE_CONTENT_TYPES[ext]) throw new NewProjectError(`"${rootImage}" is not a PNG, JPEG, SVG or WebP image`);
  let bytes: Buffer;
  try {
    bytes = await readFile(rootImage);
  } catch {
    throw new NewProjectError(`cannot read "${rootImage}"`);
  }
  const size = readImageSize(bytes, ext);
  if (!size) throw new NewProjectError(`cannot read the size of "${rootImage}"`);
  const dir = join(projectsDir, slug);
  if (await exists(dir)) throw new NewProjectError(`projects/${slug} already exists`);

  const imagePath = `${PROJECT_IMAGES_DIR}/${basename(rootImage)}`;
  const text = scaffoldProjectConfig(slug, imagePath, size);
  // Guard: never write a starter file the app would reject.
  const parsed = parseProjectConfig(JSON.parse(text));
  if (!parsed.ok) throw new NewProjectError(`internal error: starter config is invalid: ${parsed.errors.map((e) => `${e.path}: ${e.message}`).join("; ")}`);

  await mkdir(join(dir, PROJECT_IMAGES_DIR), { recursive: true });
  await copyFile(rootImage, join(dir, imagePath));
  await copyFile(unitsTemplate, join(dir, "units.xlsx"));
  await writeFile(join(dir, "project.json"), text);
  return dir;
}

/** CLI wrapper: prints what to do next; returns the exit code. */
export async function runNewProjectCli(args: readonly string[], projectsDir: string, unitsTemplate: string): Promise<number> {
  const [slug, rootImage] = args;
  if (!slug || !rootImage) {
    console.error("Usage: npm run new:project -- <slug> <root-image>");
    return 2;
  }
  try {
    await createProject({ projectsDir, slug, rootImage, unitsTemplate });
  } catch (e) {
    if (!(e instanceof NewProjectError)) throw e;
    console.error(e.message);
    return 1;
  }
  console.log(
    [
      `Created projects/${slug}/.`,
      "Next: put the logo at images/logo.svg and the other images in images/,",
      `replace the placeholders in project.json (Arabic name, WhatsApp number, currency, colours),`,
      "fill units.xlsx (or point project.json at the client's Google Sheet),",
      `then draw the project: EDITOR_ENABLED=true npm run dev and open /editor/${slug} (see docs/editor.md).`,
    ].join("\n"),
  );
  return 0;
}
