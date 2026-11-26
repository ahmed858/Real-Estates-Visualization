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
    ...scenes.flatMap((s) => [
      ...uniqueHotspotIds(s),
      ...hotspotTargets(s, sceneIds),
      ...pointsInsideImage(s),
      ...typicalFloors(s),
    ]),
  ];
}
