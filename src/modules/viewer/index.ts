// Public entry point of the `viewer` module.
// React UI for browsing a project: scene image, coloured unit shapes, cards, navigation.
// Other modules may import ONLY from "@/modules/viewer" (this file), never from files inside it.
export { ViewerMessage } from "./components/viewer-message";
export type { ViewerMessageProps } from "./components/viewer-message";
export { Image2DScene } from "./scene/image-2d-scene";
export { HOTSPOT_FILL, STATUS_STYLE } from "./scene/status-style";
export type { HotspotStyle } from "./scene/status-style";
export { DEFAULT_SCENE_RENDERERS, SceneView } from "./scene/scene-view";
export type { SceneViewProps } from "./scene/scene-view";
export type { SceneRenderer, SceneRendererProps, SceneRendererRegistry } from "./scene/scene-renderer";
export { SceneStage } from "./scene/scene-stage";
export type { SceneStageProps } from "./scene/scene-stage";
export { HoverCard, formatPrice } from "./scene/hover-card";
export type { HoverCardContent, HoverCardProps, UnitSummary } from "./scene/hover-card";
export { ViewerLayout } from "./layout/viewer-layout";
export type { ViewerLayoutProps } from "./layout/viewer-layout";
export { ProjectHeader } from "./layout/project-header";
export type { ProjectHeaderProps } from "./layout/project-header";
export { StatusLegend } from "./layout/status-legend";
export { ScenePanel } from "./layout/scene-panel";
export type { ScenePanelProps } from "./layout/scene-panel";
export { viewerText } from "./layout/viewer-text";
export type { ViewerLocale, ViewerText } from "./layout/viewer-text";
export { SidePanel } from "./panel/side-panel";
export type { SidePanelProps } from "./panel/side-panel";
export { UnitDetails } from "./panel/unit-details";
export type { UnitDetailsProps } from "./panel/unit-details";
export { UNIT_PARAM, selectUnit, useSelectedUnit } from "./selection/use-selected-unit";
export { Breadcrumbs } from "./navigation/breadcrumbs";
export type { BreadcrumbsProps, Crumb } from "./navigation/breadcrumbs";
