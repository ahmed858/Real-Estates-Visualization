"use client";
// Renderer for `type: "panorama-360"`: an equirectangular picture the visitor
// looks around in from one spot (a room, a rooftop). The scene image is the
// poster, shown on the server, while the picture loads and on devices
// without WebGL. The three.js view is loaded with a dynamic import only
// here, so other pages ship no 3D code. Hotspots, if the scene has any, are
// listed under the view like on a 3D model scene.
import { lazy, Suspense, useSyncExternalStore } from "react";
import { HotspotList } from "./hotspot-list";
import { supportsWebGL } from "./model-3d-mapping";
import { fileBaseFrom } from "./rotation-frame";
import { ScenePoster } from "./scene-poster";
import { PREMIUM_VIEW_CLASS, premiumViewStyle } from "./premium-view-size";
import type { SceneRendererProps } from "./scene-renderer";

const Panorama360Canvas = lazy(() => import("./panorama-360-canvas"));

const noSubscribe = () => () => {};

export function Panorama360Scene(props: SceneRendererProps) {
  const { scene, imageUrl } = props;
  // False on the server and during hydration, then the browser's answer.
  const webgl = useSyncExternalStore(noSubscribe, () => supportsWebGL(), () => false);
  const fileUrl = props.fileUrl ?? ((path: string) => `${fileBaseFrom(imageUrl, scene.image.path)}${path}`);
  const poster = <ScenePoster scene={scene} imageUrl={imageUrl} />;
  const live = webgl && scene.panorama;
  return (
    <div className={`mx-auto flex w-full flex-col gap-2 px-2 md:mb-16 ${PREMIUM_VIEW_CLASS}`} style={premiumViewStyle(scene.image)} data-panorama-view={live ? "360" : "poster"}>
      {live ? (
        <Suspense fallback={poster}>
          <Panorama360Canvas scene={scene} panoramaUrl={fileUrl(scene.panorama!.path)} poster={poster} />
        </Suspense>
      ) : (
        poster
      )}
      <HotspotList hotspots={scene.hotspots} hotspotLabel={props.hotspotLabel} onSelect={props.onSelect} onHover={props.onHover} label="Places in this view" />
    </div>
  );
}
