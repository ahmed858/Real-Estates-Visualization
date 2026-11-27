// Reads one file of a project folder for serving over HTTP: images anywhere
// in the folder, and 3D models (.glb) under models/. The path must stay
// inside projects/<slug>/, and premium assets must be within their size limit.
import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import { MODELS_DIR, projectFileSizeLimit } from "@/modules/domain";

export const IMAGE_CONTENT_TYPES: Readonly<Record<string, string>> = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

/** glTF binary models, served only from the project's models/ folder. */
export const MODEL_CONTENT_TYPES: Readonly<Record<string, string>> = {
  ".glb": "model/gltf-binary",
};

import { readImageSize } from "./image-size";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface ProjectFile {
  body: Buffer;
  contentType: string;
}

function contentTypeOf(segments: readonly string[]): string | undefined {
  const ext = extname(segments[segments.length - 1]).toLowerCase();
  if (IMAGE_CONTENT_TYPES[ext]) return IMAGE_CONTENT_TYPES[ext];
  if (MODEL_CONTENT_TYPES[ext] && segments[0] === MODELS_DIR) return MODEL_CONTENT_TYPES[ext];
  return undefined;
}

/**
 * Returns the file at projects/<slug>/<segments...>, or null when the slug or
 * path is not allowed, the type is not served, the file is over its size
 * limit, or it does not exist. Segments arrive already URL-decoded (e.g.
 * "%2e%2e" is "..").
 */
export async function readProjectFile(projectsDir: string, slug: string, segments: readonly string[]): Promise<ProjectFile | null> {
  if (!SLUG.test(slug) || segments.length === 0) return null;
  if (segments.some((s) => s === "" || s === "." || s === ".." || s.includes("/") || s.includes("\\") || s.includes("\0"))) return null;
  const contentType = contentTypeOf(segments);
  if (!contentType) return null;

  const root = resolve(projectsDir, slug);
  const target = resolve(root, join(...segments));
  const rel = relative(root, target);
  if (rel.startsWith("..") || rel.startsWith(sep) || rel === "") return null;

  try {
    const limit = projectFileSizeLimit(segments.join("/"));
    if (limit && (await stat(target)).size > limit.bytes) return null;
    return { body: await readFile(target), contentType };
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "EISDIR" || code === "ENOTDIR") return null;
    throw e;
  }
}

/** An image of a project folder with its pixel size, for adding a scene in the editor. */
export interface ProjectImage {
  /** Path relative to projects/<slug>/, as a scene's image.path uses it, e.g. "images/ground.png". */
  path: string;
  width: number;
  height: number;
}

export const PROJECT_IMAGES_DIR = "images";
/**
 * Every image in projects/<slug>/images/ whose size can be read, sorted by path.
 * Files that are not images, or whose size cannot be read, are left out.
 * An unknown slug or a project without an images folder gives an empty list.
 */
export async function listProjectImages(projectsDir: string, slug: string): Promise<ProjectImage[]> {
  if (!SLUG.test(slug)) return [];
  const dir = join(resolve(projectsDir, slug), PROJECT_IMAGES_DIR);
  let names: string[];
  try {
    names = (await readdir(dir, { withFileTypes: true })).filter((e) => e.isFile()).map((e) => e.name);
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR") return [];
    throw e;
  }
  const images = await Promise.all(
    names
      .filter((name) => IMAGE_CONTENT_TYPES[extname(name).toLowerCase()])
      .map(async (name) => {
        const size = readImageSize(await readFile(join(dir, name)), extname(name));
        return size ? { path: `${PROJECT_IMAGES_DIR}/${name}`, ...size } : undefined;
      }),
  );
  return images.filter((i): i is ProjectImage => i !== undefined).sort((a, b) => a.path.localeCompare(b.path));
}
