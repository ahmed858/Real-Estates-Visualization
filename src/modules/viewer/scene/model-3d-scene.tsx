"use client";
// Renderer for `type: "model-3d"`: a glTF model the visitor orbits. The scene
// image is the poster, shown on the server, while the model loads, and when
// the device has no WebGL. The 3D canvas (three.js) is loaded with a dynamic
// import only here, so 2D pages ship no 3D code. A list of the scene's
// hotspots stays below the view for keyboard and screen reader users.
import { lazy, Suspense, useSyncExternalStore } from "react";
import { HotspotList } from "./hotspot-list";
import { supportsWebGL } from "./model-3d-mapping";
import { fileBaseFrom } from "./rotation-frame";
import { ScenePoster } from "./scene-poster";
import { PREMIUM_VIEW_CLASS, premiumViewStyle } from "./premium-view-size";
import type { SceneRendererProps } from "./scene-renderer";

const Model3DCanvas = lazy(() => import("./model-3d-canvas"));

const noSubscribe = () => () => {};

export function Model3DScene(props: SceneRendererProps) {
  const { scene, imageUrl } = props;
  // False on the server and during hydration, then the browser's answer.
  const webgl = useSyncExternalStore(noSubscribe, () => supportsWebGL(), () => false);
  const fileUrl = props.fileUrl ?? ((path: string) => `${fileBaseFrom(imageUrl, scene.image.path)}${path}`);
  const poster = <ScenePoster scene={scene} imageUrl={imageUrl} />;
  return (
    <div className={`mx-auto flex w-full flex-col gap-2 px-2 md:mb-16 ${PREMIUM_VIEW_CLASS}`} style={premiumViewStyle(scene.image)} data-model-view={webgl && scene.model ? "3d" : "poster"}>
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
