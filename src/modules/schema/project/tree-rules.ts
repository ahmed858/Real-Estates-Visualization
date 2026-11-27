// Cross-field rules for the scene tree that a plain shape cannot express.
// Each rule returns issues with a path from the config root, so messages point at the exact field.
import type { ProjectConfig, Scene } from "./project-schema";

export interface RuleIssue {
  path: (string | number)[];
  message: string;
}

interface VisitedScene {
  scene: Scene;
  path: (string | number)[];
}

function collectScenes(root: Scene): VisitedScene[] {
  const out: VisitedScene[] = [];
  const visit = (scene: Scene, path: (string | number)[]) => {
    out.push({ scene, path });
    scene.children.forEach((child, i) => visit(child, [...path, "children", i]));
  };
  visit(root, ["root"]);
  return out;
}

function uniqueSceneIds(scenes: VisitedScene[]): RuleIssue[] {
  const seen = new Map<string, (string | number)[]>();
  const issues: RuleIssue[] = [];
  for (const { scene, path } of scenes) {
    const first = seen.get(scene.id);
    if (first) {
      issues.push({ path: [...path, "id"], message: `duplicate scene id "${scene.id}" (first used at ${first.join(".")})` });
    } else {
      seen.set(scene.id, path);
    }
  }
  return issues;
}

/** Page names under /p/<slug>/ that a scene id would collide with (a scene lives at /p/<slug>/<id>). */
export const RESERVED_SCENE_IDS = ["units", "compare", "lead", "explore"] as const;

function sceneIdsAreNotPageNames(scenes: VisitedScene[]): RuleIssue[] {
  return scenes.flatMap(({ scene, path }) =>
    (RESERVED_SCENE_IDS as readonly string[]).includes(scene.id)
      ? [{ path: [...path, "id"], message: `scene id "${scene.id}" is the name of a page (${RESERVED_SCENE_IDS.join(", ")}); pick another id` }]
      : [],
  );
}

function uniqueHotspotIds({ scene, path }: VisitedScene): RuleIssue[] {
  const seen = new Set<string>();
  const issues: RuleIssue[] = [];
  scene.hotspots.forEach((h, i) => {
    if (seen.has(h.id)) issues.push({ path: [...path, "hotspots", i, "id"], message: `duplicate hotspot id "${h.id}" in scene "${scene.id}"` });
    seen.add(h.id);
  });
  return issues;
}

function hotspotTargets({ scene, path }: VisitedScene, sceneIds: Set<string>): RuleIssue[] {
  const issues: RuleIssue[] = [];
  scene.hotspots.forEach((h, i) => {
    const targetPath = [...path, "hotspots", i, "target"];
    if ("scene" in h.target) {
      if (h.target.scene === scene.id) {
        issues.push({ path: [...targetPath, "scene"], message: `hotspot "${h.id}" points at its own scene` });
      } else if (!sceneIds.has(h.target.scene)) {
        issues.push({ path: [...targetPath, "scene"], message: `scene "${h.target.scene}" does not exist` });
      }
    }
    if ("unitSuffix" in h.target && !scene.floors) {
      issues.push({ path: [...targetPath, "unitSuffix"], message: "unitSuffix is only allowed on a typical floor (a scene with floors); use unit instead" });
    }
  });
  return issues;
}

function pointsInsideImage({ scene, path }: VisitedScene): RuleIssue[] {
  const { width, height } = scene.image;
  const issues: RuleIssue[] = [];
  scene.hotspots.forEach((h, i) => {
    h.points.forEach(([x, y], j) => {
      if (x < 0 || y < 0 || x > width || y > height) {
        issues.push({
          path: [...path, "hotspots", i, "points", j],
          message: `point [${x}, ${y}] is outside the image (${width}x${height})`,
        });
      }
    });
  });
  return issues;
}

/** The rotation, model and panorama blocks, per-frame polygons and mesh names belong to their renderer type only. */
function premiumBlocks({ scene, path }: VisitedScene): RuleIssue[] {
  const issues: RuleIssue[] = [];
  const isRotation = scene.type === "rotation-360";
  const isModel = scene.type === "model-3d";
  if (isRotation && !scene.rotation) issues.push({ path: [...path, "rotation"], message: 'a scene of type "rotation-360" needs a rotation block (frames, count, width, height)' });
  if (!isRotation && scene.rotation) issues.push({ path: [...path, "rotation"], message: `rotation is only allowed on a scene of type "rotation-360", not "${scene.type}"` });
  if (isModel && !scene.model) issues.push({ path: [...path, "model"], message: 'a scene of type "model-3d" needs a model block (path to a .glb file)' });
  if (!isModel && scene.model) issues.push({ path: [...path, "model"], message: `model is only allowed on a scene of type "model-3d", not "${scene.type}"` });
  if (scene.showsUnits && scene.type === "image-2d") issues.push({ path: [...path, "showsUnits"], message: 'showsUnits is only allowed on a premium scene (rotation-360, model-3d or panorama-360); a 2D scene draws its units as hotspots' });
  scene.showsUnits?.forEach((code, i) => {
    if (scene.showsUnits!.indexOf(code) !== i) issues.push({ path: [...path, "showsUnits", i], message: `unit "${code}" is listed twice` });
  });
  const isPanorama = scene.type === "panorama-360";
  if (isPanorama && !scene.panorama) issues.push({ path: [...path, "panorama"], message: 'a scene of type "panorama-360" needs a panorama block (path, width, height)' });
  if (!isPanorama && scene.panorama) issues.push({ path: [...path, "panorama"], message: `panorama is only allowed on a scene of type "panorama-360", not "${scene.type}"` });
  if (scene.rotation?.start !== undefined && scene.rotation.start > scene.rotation.count) {
    issues.push({ path: [...path, "rotation", "start"], message: `start (${scene.rotation.start}) must be a frame between 1 and count (${scene.rotation.count})` });
  }
  const meshes = new Map<string, string>();
  scene.hotspots.forEach((h, i) => {
    const hotspotPath = [...path, "hotspots", i];
    if (h.frames && !isRotation) issues.push({ path: [...hotspotPath, "frames"], message: `frames is only allowed on a scene of type "rotation-360"` });
    if (h.frames && isRotation && scene.rotation) {
      const { count, width, height } = scene.rotation;
      for (const [frame, points] of Object.entries(h.frames)) {
        if (Number(frame) > count) {
          issues.push({ path: [...hotspotPath, "frames", frame], message: `frame ${frame} does not exist (the rotation has ${count} frames)` });
          continue;
        }
        points.forEach(([x, y], j) => {
          if (x < 0 || y < 0 || x > width || y > height) {
            issues.push({ path: [...hotspotPath, "frames", frame, j], message: `point [${x}, ${y}] is outside the frame (${width}x${height})` });
          }
        });
      }
    }
    if (h.mesh !== undefined && !isModel) issues.push({ path: [...hotspotPath, "mesh"], message: `mesh is only allowed on a scene of type "model-3d"` });
    if (h.mesh !== undefined && isModel) {
      const first = meshes.get(h.mesh);
      if (first) issues.push({ path: [...hotspotPath, "mesh"], message: `mesh "${h.mesh}" is already used by hotspot "${first}"` });
      else meshes.set(h.mesh, h.id);
    }
  });
  return issues;
}

function typicalFloors({ scene, path }: VisitedScene): RuleIssue[] {
  if (!scene.floors) return [];
  const issues: RuleIssue[] = [];
  if (scene.kind !== "floor") {
    issues.push({ path: [...path, "floors"], message: `floors is only allowed on a scene of kind "floor", not "${scene.kind}"` });
  }
  if (scene.floors.from > scene.floors.to) {
    issues.push({ path: [...path, "floors", "to"], message: `to (${scene.floors.to}) must be greater than or equal to from (${scene.floors.from})` });
  }
  scene.hotspots.forEach((h, i) => {
    if ("unit" in h.target) {
      issues.push({
        path: [...path, "hotspots", i, "target", "unit"],
        message: "a typical floor serves many floors, so its hotspots must use unitSuffix instead of a fixed unit code",
      });
    }
  });
  return issues;
}

/** Runs every tree rule on a config whose shape is already valid. */
export function checkTreeRules(config: ProjectConfig): RuleIssue[] {
  const scenes = collectScenes(config.root);
  const sceneIds = new Set(scenes.map((s) => s.scene.id));
  return [
    ...uniqueSceneIds(scenes),
    ...sceneIdsAreNotPageNames(scenes),
    ...scenes.flatMap((s) => [
      ...uniqueHotspotIds(s),
      ...hotspotTargets(s, sceneIds),
      ...pointsInsideImage(s),
      ...premiumBlocks(s),
      ...typicalFloors(s),
    ]),
  ];
}
