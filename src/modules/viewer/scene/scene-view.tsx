// Picks the renderer for a scene from the registry (Strategy). Unknown renderer
// types show a clear message instead of crashing.
import { ViewerMessage } from "../components/viewer-message";
import { Image2DScene } from "./image-2d-scene";
import { Model3DScene } from "./model-3d-scene";
import { Panorama360Scene } from "./panorama-360-scene";
import { Rotation360Scene } from "./rotation-360-scene";
import type { SceneRendererProps, SceneRendererRegistry } from "./scene-renderer";

export const DEFAULT_SCENE_RENDERERS: SceneRendererRegistry = { "image-2d": Image2DScene, "rotation-360": Rotation360Scene, "model-3d": Model3DScene, "panorama-360": Panorama360Scene };

export interface SceneViewProps extends SceneRendererProps {
  renderers?: SceneRendererRegistry;
}

export function SceneView({ renderers = DEFAULT_SCENE_RENDERERS, ...props }: SceneViewProps) {
  const Renderer = renderers[props.scene.type];
  if (!Renderer) {
    return <ViewerMessage title="This view is not available yet" details={[`Scene "${props.scene.id}" uses renderer "${props.scene.type}".`]} />;
  }
  return <Renderer {...props} />;
}
