// Read-only preview of one scene: its image with the existing hotspot
// outlines, in image pixel coordinates. Drawing arrives with U-604.
import type { Scene } from "@/modules/schema";

export interface ScenePreviewProps {
  scene: Pick<Scene, "id" | "image" | "hotspots">;
  imageUrl: string;
  title: string;
}

export function ScenePreview({ scene, imageUrl, title }: ScenePreviewProps) {
  const { width, height } = scene.image;
  return (
    <figure className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title} className="h-auto w-full max-w-full bg-zinc-900">
        <image href={imageUrl} width={width} height={height} />
        {scene.hotspots.map((h) => (
          <polygon key={h.id} data-hotspot={h.id} points={h.points.map(([x, y]) => `${x},${y}`).join(" ")} fill="#38bdf8" fillOpacity={0.15} stroke="#38bdf8" strokeWidth={Math.max(1, width / 500)} />
        ))}
      </svg>
      <figcaption className="text-sm text-zinc-400">
        {scene.id} · {width}×{height} px · {scene.hotspots.length} hotspots
      </figcaption>
    </figure>
  );
}
