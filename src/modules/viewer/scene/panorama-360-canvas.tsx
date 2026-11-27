"use client";
// The three.js part of the panorama renderer, loaded on demand by
// Panorama360Scene: the picture is the scene background (equirectangular
// mapping), the camera turns in place with drag, swipe, the arrow keys and
// the +/- keys, and zooms with the wheel or a pinch. Until the visitor
// touches it the view turns slowly, unless they prefer reduced motion.
// Browser-only; not unit tested (no WebGL in tests): the maths lives in
// panorama-look.ts.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { EquirectangularReflectionMapping, PerspectiveCamera, Scene as World, SRGBColorSpace, TextureLoader, Vector3, WebGLRenderer } from "three";
import type { Scene } from "@/modules/schema";
import { DEFAULT_LOOK, dragLook, keyLook, lookDirection, zoomLook, type PanoramaLook } from "./panorama-look";

export interface Panorama360CanvasProps {
  scene: Scene;
  panoramaUrl: string;
  /** Shown until the picture has loaded, and if it fails to load. */
  poster: ReactNode;
}

/** Degrees per second of the idle turn. */
const IDLE_SPEED = 3;

export default function Panorama360Canvas({ scene, panoramaUrl, poster }: Panorama360CanvasProps) {
  const host = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const renderer = new WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = SRGBColorSpace;
    const width = () => el.clientWidth || 1;
    const height = () => Math.round((width() * scene.image.height) / scene.image.width) || 1;
    renderer.setSize(width(), height());
    const canvas = renderer.domElement;
    canvas.tabIndex = 0;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", `${scene.title.en}: 360° view. Drag or use the arrow keys to look around, + and - to zoom.`);
    canvas.className = "block h-auto w-full cursor-grab touch-none outline-none focus-visible:ring-2";
    el.appendChild(canvas);

    const world = new World();
    const camera = new PerspectiveCamera(DEFAULT_LOOK.fov, width() / height(), 0.1, 10);
    let look: PanoramaLook = DEFAULT_LOOK;
    let idle = !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const target = new Vector3();
    const apply = () => {
      camera.fov = look.fov;
      camera.updateProjectionMatrix();
      target.set(...lookDirection(look));
      camera.lookAt(target);
    };
    apply();

    let disposed = false;
    new TextureLoader().load(
      panoramaUrl,
      (texture) => {
        if (disposed) return texture.dispose();
        texture.mapping = EquirectangularReflectionMapping;
        texture.colorSpace = SRGBColorSpace;
        world.background = texture;
        setState("ready");
      },
      undefined,
      () => !disposed && setState("failed"),
    );

    // Pointer drag and two-finger pinch.
    const pointers = new Map<number, { x: number; y: number }>();
    let pinch: number | undefined;
    const spread = () => {
      const [a, b] = [...pointers.values()];
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : undefined;
    };
    const onDown = (e: PointerEvent) => {
      idle = false;
      canvas.setPointerCapture?.(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      pinch = spread();
      canvas.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      const last = pointers.get(e.pointerId);
      if (!last) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) look = dragLook(look, e.clientX - last.x, e.clientY - last.y, canvas.clientHeight);
      else {
        const now = spread();
        if (now !== undefined && pinch !== undefined) look = zoomLook(look, (pinch - now) * 0.15);
        pinch = now;
      }
      apply();
    };
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      pinch = spread();
      canvas.style.cursor = "";
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      idle = false;
      look = zoomLook(look, Math.sign(e.deltaY) * 5);
      apply();
    };
    const onKey = (e: KeyboardEvent) => {
      const rtl = getComputedStyle(canvas).direction === "rtl";
      const next = keyLook(look, e.key, rtl);
      if (!next) return;
      e.preventDefault();
      idle = false;
      look = next;
      apply();
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("keydown", onKey);

    const resize = new ResizeObserver(() => {
      renderer.setSize(width(), height());
      camera.aspect = width() / height();
      camera.updateProjectionMatrix();
    });
    resize.observe(el);
    let last = performance.now();
    renderer.setAnimationLoop((now) => {
      if (idle) {
        look = { ...look, yaw: look.yaw + (IDLE_SPEED * (now - last)) / 1000 };
        apply();
      }
      last = now;
      renderer.render(world, camera);
    });

    return () => {
      disposed = true;
      resize.disconnect();
      renderer.setAnimationLoop(null);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("keydown", onKey);
      (world.background as { dispose?: () => void } | null)?.dispose?.();
      renderer.dispose();
      canvas.remove();
    };
  }, [scene, panoramaUrl]);

  return (
    <div className="relative w-full">
      <div ref={host} className={state === "ready" ? "w-full" : "absolute inset-0 opacity-0"} />
      {state !== "ready" && poster}
      {state === "failed" && <p className="text-sm text-zinc-400">The 360° picture could not be loaded; showing a still instead.</p>}
    </div>
  );
}
