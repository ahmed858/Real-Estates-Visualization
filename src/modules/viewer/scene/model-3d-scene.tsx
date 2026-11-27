"use client";
// Renderer for `type: "model-3d"`: a glTF model the visitor orbits. The scene
// image is the poster, shown on the server, while the model loads, and when
// the device has no WebGL. The 3D canvas (three.js) is loaded with a dynamic
// import only here, so 2D pages ship no 3D code. A list of the scene's
// hotspots stays below the view for keyboard and screen reader users.
import { lazy, Suspense, useSyncExternalStore } from "react";
import type { Hotspot } from "@/modules/schema";
import { supportsWebGL } from "./model-3d-mapping";
import { fileBaseFrom } from "./rotation-frame";
import type { SceneRendererProps } from "./scene-renderer";

const Model3DCanvas = lazy(() => import("./model-3d-canvas"));

const noSubscribe = () => () => {};

function Poster({ scene, imageUrl }: Pick<SceneRendererProps, "scene" | "imageUrl">) {
  const { width, height } = scene.image;
  return (
    <div className="relative w-full" style={{ aspectRatio: `${width} / ${height}` }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- project files are served as-is by /files */}
      <img src={imageUrl} alt={scene.title.en} width={width} height={height} className="absolute inset-0 h-full w-full select-none object-contain" />
    </div>
  );
}

/** Buttons for the scene's hotspots, so every unit can be reached without the 3D view. */
function HotspotList({ hotspots, hotspotLabel, onSelect, onHover }: { hotspots: readonly Hotspot[] } & Pick<SceneRendererProps, "hotspotLabel" | "onSelect" | "onHover">) {
  if (hotspots.length === 0) return null;
  return (
    <ul aria-label="Units in this view" className="flex flex-wrap gap-2">
      {hotspots.map((h) => (
        <li key={h.id}>
          <button
            type="button"
            data-model-hotspot={h.id}
            className="rounded border border-white/20 px-2 py-1 text-sm hover:bg-white/10 focus-visible:outline focus-visible:outline-2"
            onClick={() => onSelect?.(h)}
            onMouseEnter={() => onHover?.(h)}
            onMouseLeave={() => onHover?.(null)}
            onFocus={() => onHover?.(h)}
            onBlur={() => onHover?.(null)}
          >
            {hotspotLabel(h)}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function Model3DScene(props: SceneRendererProps) {
  const { scene, imageUrl } = props;
  // False on the server and during hydration, then the browser's answer.
  const webgl = useSyncExternalStore(noSubscribe, () => supportsWebGL(), () => false);
  const fileUrl = props.fileUrl ?? ((path: string) => `${fileBaseFrom(imageUrl, scene.image.path)}${path}`);
  const poster = <Poster scene={scene} imageUrl={imageUrl} />;
  return (
    <div className="flex w-full flex-col gap-2" data-model-view={webgl && scene.model ? "3d" : "poster"}>
      {webgl && scene.model ? (
        <Suspense fallback={poster}>
          <Model3DCanvas {...props} modelUrl={fileUrl(scene.model.path)} poster={poster} />
        </Suspense>
      ) : (
        poster
      )}
      <HotspotList hotspots={scene.hotspots} hotspotLabel={props.hotspotLabel} onSelect={props.onSelect} onHover={props.onHover} />
    </div>
  );
}
