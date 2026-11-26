// Reads one image of a project folder for serving over HTTP. Only image types
// are allowed, and the path must stay inside projects/<slug>/.
import { readFile } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";

export const IMAGE_CONTENT_TYPES: Readonly<Record<string, string>> = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface ProjectFile {
  body: Buffer;
  contentType: string;
}

/**
 * Returns the file at projects/<slug>/<segments...>, or null when the slug or
 * path is not allowed, the type is not an image, or the file does not exist.
 * Segments arrive already URL-decoded (e.g. "%2e%2e" is "..").
 */
export async function readProjectImage(projectsDir: string, slug: string, segments: readonly string[]): Promise<ProjectFile | null> {
  if (!SLUG.test(slug) || segments.length === 0) return null;
  if (segments.some((s) => s === "" || s === "." || s === ".." || s.includes("/") || s.includes("\\") || s.includes("\0"))) return null;
  const contentType = IMAGE_CONTENT_TYPES[extname(segments[segments.length - 1]).toLowerCase()];
  if (!contentType) return null;

  const root = resolve(projectsDir, slug);
  const target = resolve(root, join(...segments));
  const rel = relative(root, target);
  if (rel.startsWith("..") || rel.startsWith(sep) || rel === "") return null;

  try {
    return { body: await readFile(target), contentType };
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "EISDIR" || code === "ENOTDIR") return null;
    throw e;
  }
}
