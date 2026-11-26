// Scene list rows and URLs for the editor page, built from the edited config.
import { createSceneTree } from "@/modules/domain";
import type { ProjectConfig } from "@/modules/schema";
import type { EditorSceneItem } from "../workspace/scene-list";

export const SCENE_PARAM = "scene";

export const editorSceneHref = (editorPath: string, sceneId: string) => `${editorPath}?${SCENE_PARAM}=${encodeURIComponent(sceneId)}`;

/** The scene id in a location search string ("?scene=ground"), if any. */
export function sceneIdFromSearch(search: string): string | undefined {
  return new URLSearchParams(search).get(SCENE_PARAM) ?? undefined;
}

/** Every scene, parents before children, with its depth and link. */
export function editorSceneItems(config: ProjectConfig, editorPath: string): EditorSceneItem[] {
  const tree = createSceneTree(config);
  return tree.scenes.map((s) => ({
    id: s.id,
    title: s.title.en,
    depth: tree.breadcrumbs(s.id).length - 1,
    href: editorSceneHref(editorPath, s.id),
    hotspotCount: s.hotspots.length,
  }));
}
