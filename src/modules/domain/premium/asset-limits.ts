// Size limits for premium assets, shared by the /files route (which refuses
// larger files) and `npm run validate` (which reports them). Plain scene
// images, logos and plan images have no limit.

export const ROTATIONS_DIR = "rotations";
export const MODELS_DIR = "models";

export const MAX_ROTATION_FRAME_BYTES = 2 * 1024 * 1024;
export const MAX_MODEL_BYTES = 30 * 1024 * 1024;

const under = (path: string, dir: string) => path.split(/[\\/]/)[0] === dir;

/** The largest size allowed for a project file (path relative to the project folder), or undefined for no limit. */
export function projectFileSizeLimit(path: string): { bytes: number; label: string } | undefined {
  if (path.toLowerCase().endsWith(".glb")) return { bytes: MAX_MODEL_BYTES, label: "3D models" };
  if (under(path, ROTATIONS_DIR)) return { bytes: MAX_ROTATION_FRAME_BYTES, label: "rotation frames" };
  return undefined;
}

/** "2 MB", "30 MB", "1.4 MB". */
export function formatMegabytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
}
