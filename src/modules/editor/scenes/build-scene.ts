// Turns the "add a scene" form into a scene, checked with the same schema and
// tree rules as project.json. The image size comes from the project image
// list (read on the server), never from the owner.
import { createSceneTree } from "@/modules/domain";
import { parseProjectConfig, type ProjectConfig, type Scene, type SceneImage, type SceneKind } from "@/modules/schema";

export interface SceneFormInput {
  id: string;
  kind: SceneKind;
  titleAr: string;
  titleEn: string;
  /** Only for a typical floor: one plan serving floors from..to. */
  floors?: { from: number; to: number; unitCode: string };
}

export type BuildSceneResult = { ok: true; scene: Scene } | { ok: false; errors: string[] };

/** Builds the new scene, or lists what is wrong with the form ("title.en: ..."). */
export function buildScene(config: ProjectConfig, input: SceneFormInput, image: SceneImage): BuildSceneResult {
  const draft = {
    id: input.id.trim(),
    kind: input.kind,
    title: { ar: input.titleAr.trim(), en: input.titleEn.trim() },
    image: { path: image.path, width: image.width, height: image.height },
    ...(input.floors ? { floors: { ...input.floors, unitCode: input.floors.unitCode.trim() } } : {}),
  };
  if (draft.id && createSceneTree(config).has(draft.id)) return { ok: false, errors: [`id: another scene already uses "${draft.id}"`] };
  // Checked as the root of an otherwise unchanged project, so only this scene's problems show.
  const parsed = parseProjectConfig({ ...config, root: draft });
  if (!parsed.ok) return { ok: false, errors: parsed.errors.map((e) => `${e.path.replace(/^root\.?/, "") || "scene"}: ${e.message}`) };
  return { ok: true, scene: parsed.value.root };
}
