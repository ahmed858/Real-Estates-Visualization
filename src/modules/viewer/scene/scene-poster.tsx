// The scene image shown by a premium renderer while its view loads, and
// instead of it when the device cannot draw WebGL.
import type { SceneRendererProps } from "./scene-renderer";

export function ScenePoster({ scene, imageUrl }: Pick<SceneRendererProps, "scene" | "imageUrl">) {
  const { width, height } = scene.image;
  return (
    <div className="relative w-full" style={{ aspectRatio: `${width} / ${height}` }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- project files are served as-is by /files */}
      <img src={imageUrl} alt={scene.title.en} width={width} height={height} className="absolute inset-0 h-full w-full select-none object-contain" />
    </div>
  );
}
