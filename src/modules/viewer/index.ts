// Public entry point of the `viewer` module.
// React UI for browsing a project: scene image, coloured unit shapes, cards, navigation.
// Other modules may import ONLY from "@/modules/viewer" (this file), never from files inside it.
export { ViewerMessage } from "./components/viewer-message";
export type { ViewerMessageProps } from "./components/viewer-message";
export { Image2DScene, HOTSPOT_FILL } from "./scene/image-2d-scene";
export { DEFAULT_SCENE_RENDERERS, SceneView } from "./scene/scene-view";
export type { SceneViewProps } from "./scene/scene-view";
export type { SceneRenderer, SceneRendererProps, SceneRendererRegistry } from "./scene/scene-renderer";
