// Prints an edited project config as project.json, the way the committed
// projects are printed (2-space indent, trailing newline), leaving out the
// values the schema fills in by default so an export without edits equals
// the committed file and real edits give small diffs.
import { DEFAULT_SCENE_RENDERER_TYPE, type ProjectConfig, type Scene } from "@/modules/schema";

export const PROJECT_JSON_FILE = "project.json";

type SceneJson = Omit<Scene, "type" | "children"> & { type?: Scene["type"]; children?: SceneJson[] };

function sceneJson({ type, children, ...rest }: Scene): SceneJson {
  // Key order follows the schema: id, kind, type, title, image, rotation, model, panorama, floors, hotspots, children.
  const { id, kind, title, image, rotation, model, panorama, floors, hotspots } = rest;
  return {
    id,
    kind,
    ...(type !== DEFAULT_SCENE_RENDERER_TYPE && { type }),
    title,
    image,
    ...(rotation && { rotation }),
    ...(model && { model }),
    ...(panorama && { panorama }),
    ...(floors && { floors }),
    hotspots,
    ...(children.length > 0 && { children: children.map(sceneJson) }),
  };
}

export function serializeProjectConfig(config: ProjectConfig): string {
  const { schemaVersion, project, units, root } = config;
  return `${JSON.stringify({ schemaVersion, project, ...(units && { units }), root: sceneJson(root) }, null, 2)}\n`;
}
