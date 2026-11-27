"use client";
// Renderer for `type: "rotation-360"`: a turntable. The visitor drags or
// swipes across the view, uses the slider, or the arrow keys on it, to turn
// the building; each frame is drawn by the 2D renderer with that frame's
// polygons, so hotspots, status colours and hover cards look the same as 2D.
// The angle is kept in ?frame= so a shared link opens at the same view.
import { useEffect, useMemo, useRef, type PointerEvent } from "react";
import { rotationFramePaths } from "@/modules/domain";
import { Image2DScene } from "./image-2d-scene";
import { setUrlParams, useUrlSearch } from "../selection/use-selected-unit";
import { fileBaseFrom, FRAME_PARAM, initialFrame, sceneOnFrame, wrapFrame } from "./rotation-frame";
import type { SceneRendererProps } from "./scene-renderer";

/** Dragging this many CSS pixels moves one frame at most; wide views turn one full round per width. */
const MIN_PIXELS_PER_FRAME = 4;
/** A press that moves less than this is a click, not a drag. */
const DRAG_THRESHOLD = 6;

export function Rotation360Scene(props: SceneRendererProps) {
  const { scene, imageUrl } = props;
  const rotation = scene.rotation;
  // Read from the URL like ?unit= (empty on the server), so the server HTML and
  // the first client render both show the start frame and hydrate cleanly.
  const search = useUrlSearch();
  const frame = rotation ? initialFrame(rotation, search) : 1;
  const drag = useRef<{ x: number; frame: number; moved: boolean } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const fileUrl = props.fileUrl ?? ((path: string) => `${fileBaseFrom(imageUrl, scene.image.path)}${path}`);

  // Fetch every frame in the background so turning is smooth.
  const paths = useMemo(() => (rotation ? rotationFramePaths(rotation) : []), [rotation]);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.Image !== "function") return;
    for (const path of paths) new window.Image().src = fileUrl(path);
    // fileUrl is derived from props that do not change for one scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paths]);

  if (!rotation) return <Image2DScene {...props} />;
  const count = rotation.count;
  const onFrame = sceneOnFrame(scene, rotation, frame);

  const show = (n: number) => {
    setUrlParams({ [FRAME_PARAM]: String(wrapFrame(n, count)) });
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    drag.current = { x: e.clientX, frame, moved: false };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) < DRAG_THRESHOLD) return;
    d.moved = true;
    const width = box.current?.getBoundingClientRect().width || count * MIN_PIXELS_PER_FRAME;
    const perFrame = Math.max(MIN_PIXELS_PER_FRAME, width / count);
    // Dragging to the right turns the building to the right: earlier frames.
    const next = wrapFrame(d.frame - Math.round(dx / perFrame), count);
    if (next !== frame) show(next);
  };
  const endDrag = () => {
    // Keep `moved` until the click that follows the release has been swallowed.
    setTimeout(() => {
      drag.current = null;
    }, 0);
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <div
        ref={box}
        data-rotation-frame={frame}
        className="w-full cursor-grab touch-pan-y select-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
        onClickCapture={(e) => {
          // A drag must not also open the hotspot under the pointer.
          if (drag.current?.moved) {
            e.stopPropagation();
            e.preventDefault();
          }
        }}
      >
        <Image2DScene {...props} scene={onFrame} imageUrl={fileUrl(onFrame.image.path)} />
      </div>
      <input
        type="range"
        min={1}
        max={count}
        step={1}
        value={frame}
        onChange={(e) => show(Number(e.target.value))}
        aria-label={`${scene.title.en}: turn the view`}
        aria-valuetext={`${frame} / ${count}`}
        className="w-full accent-[var(--brand-accent,#c89b3c)]"
      />
    </div>
  );
}
