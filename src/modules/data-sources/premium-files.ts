// Lists the premium assets of a project folder for the editor's add-scene
// form: each frames folder under rotations/ (with every frame's pixel size,
// read here so the browser never needs file system access) and each .glb
// model under models/, and each 2:1 picture under panoramas/ with its size.
// Checking that a folder is a usable turntable is the
// editor's job; this only reports what is on disk.
import { readdir, readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { MODELS_DIR, PANORAMAS_DIR, ROTATIONS_DIR } from "@/modules/domain";
import { readImageSize } from "./image-size";
import { IMAGE_CONTENT_TYPES, MODEL_CONTENT_TYPES, type ProjectImage } from "./project-files";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** One image file in a frames folder; no size when it cannot be read. */
export interface RotationFolderFile {
  name: string;
  width?: number;
  height?: number;
}

/** A folder under rotations/, e.g. "rotations/tower", with its image files sorted by name. */
export interface RotationFolder {
  folder: string;
  files: RotationFolderFile[];
}

async function entries(dir: string) {
  try {
    return await readdir(dir, { withFileTypes: true });
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR") return [];
    throw e;
  }
}

/** Every folder directly under projects/<slug>/rotations/, sorted by path. Unknown or unsafe slugs give an empty list. */
export async function listRotationFolders(projectsDir: string, slug: string): Promise<RotationFolder[]> {
  if (!SLUG.test(slug)) return [];
  const root = join(resolve(projectsDir, slug), ROTATIONS_DIR);
  const folders = (await entries(root)).filter((e) => e.isDirectory()).map((e) => e.name);
  const listed = await Promise.all(
    folders.map(async (name) => {
      const dir = join(root, name);
      const images = (await entries(dir)).filter((e) => e.isFile() && IMAGE_CONTENT_TYPES[extname(e.name).toLowerCase()]).map((e) => e.name);
      const files = await Promise.all(
        images.map(async (file): Promise<RotationFolderFile> => {
          const size = readImageSize(await readFile(join(dir, file)), extname(file));
          return size ? { name: file, ...size } : { name: file };
        }),
      );
      return { folder: `${ROTATIONS_DIR}/${name}`, files: files.sort((a, b) => a.name.localeCompare(b.name)) };
    }),
  );
  return listed.sort((a, b) => a.folder.localeCompare(b.folder));
}

/** Every .glb file directly in projects/<slug>/models/, as "models/<name>.glb", sorted. */
export async function listProjectModels(projectsDir: string, slug: string): Promise<string[]> {
  if (!SLUG.test(slug)) return [];
  const dir = join(resolve(projectsDir, slug), MODELS_DIR);
  return (await entries(dir))
    .filter((e) => e.isFile() && MODEL_CONTENT_TYPES[extname(e.name).toLowerCase()])
    .map((e) => `${MODELS_DIR}/${e.name}`)
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Every equirectangular picture (exactly twice as wide as tall, not SVG)
 * directly in projects/<slug>/panoramas/, as "panoramas/<name>" with its
 * size, sorted. Pictures of another shape are left out: they cannot be a 360° view.
 */
export async function listProjectPanoramas(projectsDir: string, slug: string): Promise<ProjectImage[]> {
  if (!SLUG.test(slug)) return [];
  const dir = join(resolve(projectsDir, slug), PANORAMAS_DIR);
  const names = (await entries(dir)).filter((e) => e.isFile() && extname(e.name).toLowerCase() !== ".svg" && IMAGE_CONTENT_TYPES[extname(e.name).toLowerCase()]).map((e) => e.name);
  const listed = await Promise.all(
    names.map(async (name): Promise<ProjectImage | undefined> => {
      const size = readImageSize(await readFile(join(dir, name)), extname(name));
      return size && size.width === size.height * 2 ? { path: `${PANORAMAS_DIR}/${name}`, ...size } : undefined;
    }),
  );
  return listed.filter((p): p is ProjectImage => p !== undefined).sort((a, b) => a.path.localeCompare(b.path));
}
