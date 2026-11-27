// Turns the "add a scene" form into a scene, checked with the same schema and
// tree rules as project.json. The image size comes from the project image
// list (read on the server), never from the owner. A premium scene keeps the
// picked image as its poster and adds its rotation (from a listed frames
// folder) or its model (a listed .glb).
import { createSceneTree } from "@/modules/domain";
import { parseProjectConfig, type ProjectConfig, type Scene, type SceneImage, type SceneKind } from "@/modules/schema";
import { rotationFromFolder, type FramesFolder } from "./rotation-folder";

export interface SceneFormInput {
  id: string;
  kind: SceneKind;
  titleAr: string;
  titleEn: string;
  /** Only for a typical floor: one plan serving floors from..to. */
  floors?: { from: number; to: number; unitCode: string };
}

/** How the new scene is shown: a plain image (default), a turntable of frames, or a 3D model. */
export type SceneRendererChoice =
  | { type: "image-2d" }
  | { type: "rotation-360"; folder: FramesFolder | undefined }
  | { type: "model-3d"; modelPath: string | undefined };

export type BuildSceneResult = { ok: true; scene: Scene } | { ok: false; errors: string[] };

/** Builds the new scene, or lists what is wrong with the form ("title.en: ..."). */
export function buildScene(config: ProjectConfig, input: SceneFormInput, image: SceneImage, renderer: SceneRendererChoice = { type: "image-2d" }): BuildSceneResult {
  const premium = premiumFields(renderer);
  if (!premium.ok) return premium;
  const draft = {
    id: input.id.trim(),
    kind: input.kind,
    title: { ar: input.titleAr.trim(), en: input.titleEn.trim() },
    image: { path: image.path, width: image.width, height: image.height },
    ...premium.fields,
    ...(input.floors ? { floors: { ...input.floors, unitCode: input.floors.unitCode.trim() } } : {}),
  };
  if (draft.id && createSceneTree(config).has(draft.id)) return { ok: false, errors: [`id: another scene already uses "${draft.id}"`] };
  // Checked as the root of an otherwise unchanged project, so only this scene's problems show.
  const parsed = parseProjectConfig({ ...config, root: draft });
  if (!parsed.ok) return { ok: false, errors: parsed.errors.map((e) => `${e.path.replace(/^root\.?/, "") || "scene"}: ${e.message}`) };
  return { ok: true, scene: parsed.value.root };
}

type PremiumFields = { ok: true; fields: Partial<Pick<Scene, "type" | "rotation" | "model">> } | { ok: false; errors: string[] };

function premiumFields(renderer: SceneRendererChoice): PremiumFields {
  switch (renderer.type) {
    case "image-2d":
      return { ok: true, fields: {} };
    case "rotation-360": {
      if (!renderer.folder) return { ok: false, errors: ["rotation: pick a frames folder from the project's rotations folder"] };
      const rotation = rotationFromFolder(renderer.folder);
      return rotation.ok ? { ok: true, fields: { type: "rotation-360", rotation: rotation.rotation } } : rotation;
    }
    case "model-3d":
      if (!renderer.modelPath) return { ok: false, errors: ["model: pick a .glb file from the project's models folder"] };
      return { ok: true, fields: { type: "model-3d", model: { path: renderer.modelPath } } };
  }
}
