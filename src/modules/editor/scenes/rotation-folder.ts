// Turns a listed frames folder (rotations/<name>/ with each file's size) into
// the rotation block of a rotation-360 scene. The frames must be one name
// pattern numbered 1..n, zero-padded the way the viewer builds frame paths
// (to the digits of n), all the same pixel size.
import { rotationFramePath } from "@/modules/domain";
import { ROTATION_FRAME_PLACEHOLDER, type SceneRotation } from "@/modules/schema";

/** One image file of a frames folder; no size when the server could not read it. */
export interface FrameFile {
  name: string;
  width?: number;
  height?: number;
}

/** A frames folder as the editor page lists it, e.g. { folder: "rotations/tower", files: [...] }. */
export interface FramesFolder {
  folder: string;
  files: readonly FrameFile[];
}

export type RotationFromFolderResult = { ok: true; rotation: SceneRotation } | { ok: false; errors: string[] };

const NUMBERED = /^(.*?)(\d+)(\.[^.]+)$/;

/** The rotation block for the folder, or why its frames cannot make a turntable ("rotation: ..."). */
export function rotationFromFolder({ folder, files }: FramesFolder): RotationFromFolderResult {
  const fail = (message: string): RotationFromFolderResult => ({ ok: false, errors: [`rotation: ${message}`] });
  if (files.length < 2) return fail(`${folder} needs at least 2 frames`);

  const parsed = files.map((f) => ({ file: f, match: NUMBERED.exec(f.name) }));
  const unnumbered = parsed.filter((p) => !p.match).map((p) => p.file.name);
  if (unnumbered.length) return fail(`${folder}: frame names must end in a number, e.g. frame-01.jpg (not ${unnumbered.join(", ")})`);
  const [, prefix, , ext] = parsed[0].match!;
  if (parsed.some((p) => p.match![1] !== prefix || p.match![3] !== ext)) return fail(`${folder}: every frame must be named ${prefix}<number>${ext}`);

  const count = files.length;
  const frames = `${folder}/${prefix}${ROTATION_FRAME_PLACEHOLDER}${ext}`;
  const names = new Set(files.map((f) => f.name));
  const missing = Array.from({ length: count }, (_, i) => i + 1).filter((n) => !names.has(rotationFramePath({ frames: `${prefix}${ROTATION_FRAME_PLACEHOLDER}${ext}`, count }, n)));
  if (missing.length) {
    const digits = String(count).length;
    return fail(`${folder}: ${count} frames must be numbered 1 to ${count} with ${digits} digit${digits > 1 ? "s" : ""} (e.g. ${prefix}${"1".padStart(digits, "0")}${ext}); missing ${missing.join(", ")}`);
  }

  const unreadable = files.filter((f) => f.width === undefined || f.height === undefined).map((f) => f.name);
  if (unreadable.length) return fail(`${folder}: cannot read the size of ${unreadable.join(", ")}`);
  const { width, height } = files[0] as Required<FrameFile>;
  const odd = files.filter((f) => f.width !== width || f.height !== height).map((f) => `${f.name} (${f.width}×${f.height})`);
  if (odd.length) return fail(`${folder}: every frame must be ${width}×${height} like ${files[0].name}, not ${odd.join(", ")}`);

  return { ok: true, rotation: { frames, count, width, height } };
}
