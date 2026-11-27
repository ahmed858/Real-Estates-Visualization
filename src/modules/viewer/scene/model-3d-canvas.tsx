"use client";
// The three.js part of the model-3d renderer, loaded on demand by
// Model3DScene. It loads the .glb, frames it, lets the visitor orbit (drag,
// pinch, arrow keys when focused), tints every mesh named by a hotspot with
// its status colour, and turns hover and click on those meshes into the same
// onHover / onSelect calls as a 2D hotspot. A mesh that links to a scene (a
// floor of a building model) keeps the model's own materials and glows in
// the scene colour while hovered, so a textured model still looks like
// itself. Browser-only; not unit tested
// (no WebGL in tests): the logic it relies on lives in model-3d-mapping.ts.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ACESFilmicToneMapping, AmbientLight, Box3, Color, DirectionalLight, HemisphereLight, Mesh, MeshStandardMaterial, PerspectiveCamera, PMREMGenerator, Raycaster, Scene, SRGBColorSpace, Vector2, Vector3, WebGLRenderer, type Material, type Object3D } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { Hotspot } from "@/modules/schema";
import { hotspotForObject, meshHotspots, meshTint } from "./model-3d-mapping";
import type { SceneRendererProps } from "./scene-renderer";

export interface Model3DCanvasProps extends SceneRendererProps {
  modelUrl: string;
  /** Shown until the model has loaded, and if it fails to load. */
  poster: ReactNode;
}

/** A press that moves more than this many pixels is an orbit, not a click. */
const CLICK_SLOP = 5;

/** Materials that light up while their hotspot is hovered, by hotspot id. */
type GlowMaterials = Map<string, MeshStandardMaterial[]>;

/**
 * Unit meshes get a material in their status colour; scene-link meshes keep
 * their own materials (copied, so only they change). Either way the colour
 * also becomes the material's emissive colour, off until hovered.
 */
function tint(root: Object3D, byMesh: ReadonlyMap<string, Hotspot>, colourOf: (h: Hotspot) => string | undefined): GlowMaterials {
  const glow: GlowMaterials = new Map();
  root.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    const hotspot = hotspotForObject(o, byMesh);
    const colour = hotspot && colourOf(hotspot);
    if (!hotspot || !colour) return;
    const own: Material[] =
      "scene" in hotspot.target
        ? ([o.material].flat() as Material[]).map((m) => m.clone())
        : [new MeshStandardMaterial({ color: new Color(colour), roughness: 0.6, metalness: 0, transparent: true, opacity: 0.92 })];
    o.material = own.length === 1 ? own[0] : own;
    for (const m of own) {
      if (!(m instanceof MeshStandardMaterial)) continue;
      m.emissive = new Color(colour);
      m.emissiveIntensity = 0;
      glow.set(hotspot.id, [...(glow.get(hotspot.id) ?? []), m]);
    }
  });
  return glow;
}

/** The hovered hotspot's materials glow; the others go back to normal. */
function highlight(glow: GlowMaterials, hovered: Hotspot | undefined) {
  for (const [id, materials] of glow) for (const m of materials) m.emissiveIntensity = id === hovered?.id ? 0.45 : 0;
}

export default function Model3DCanvas({ scene, modelUrl, poster, unitStatusOf, hotspotLabel, onSelect, onHover }: Model3DCanvasProps) {
  const host = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const [hovered, setHovered] = useState<Hotspot | null>(null);
  // Latest callbacks, read by the three.js listeners without re-creating the scene.
  const callbacks = useRef({ onSelect, onHover, unitStatusOf });
  useEffect(() => {
    callbacks.current = { onSelect, onHover, unitStatusOf };
  });

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const byMesh = meshHotspots(scene);
    const renderer = new WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    const width = () => el.clientWidth || 1;
    const height = () => Math.round((width() * scene.image.height) / scene.image.width) || 1;
    renderer.setSize(width(), height());
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute("aria-label", `${scene.title.en}: 3D view. Drag or use the arrow keys to turn it.`);
    renderer.domElement.className = "block h-auto w-full touch-none outline-none focus-visible:ring-2";
    el.appendChild(renderer.domElement);

    const world = new Scene();
    // Soft light from a neutral room plus a sun, so every side of the model reads.
    const pmrem = new PMREMGenerator(renderer);
    world.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    world.environmentIntensity = 0.55;
    pmrem.dispose();
    world.add(new AmbientLight(0xffffff, 0.3));
    world.add(new HemisphereLight(0xdfeeff, 0x8a7a60, 0.6));
    const sun = new DirectionalLight(0xfff1dd, 2.4);
    sun.position.set(1, 2, -1.5);
    world.add(sun);
    const camera = new PerspectiveCamera(40, width() / height(), 0.1, 10000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.listenToKeyEvents(renderer.domElement);

    let disposed = false;
    let model: Object3D | undefined;
    let glow: GlowMaterials = new Map();
    new GLTFLoader().load(
      modelUrl,
      (gltf) => {
        if (disposed) return;
        model = gltf.scene;
        glow = tint(model, byMesh, (h) => meshTint(h, callbacks.current.unitStatusOf));
        world.add(model);
        const box = new Box3().setFromObject(model);
        const centre = box.getCenter(new Vector3());
        const size = box.getSize(new Vector3()).length() || 1;
        camera.position.copy(centre).add(new Vector3(size * 0.6, size * 0.45, size * 0.8));
        camera.near = size / 100;
        camera.far = size * 20;
        camera.updateProjectionMatrix();
        controls.target.copy(centre);
        controls.update();
        setState("ready");
      },
      undefined,
      () => !disposed && setState("failed"),
    );

    const raycaster = new Raycaster();
    const pick = (e: PointerEvent): Hotspot | undefined => {
      if (!model) return undefined;
      const r = renderer.domElement.getBoundingClientRect();
      const pointer = new Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      return hotspotForObject(raycaster.intersectObject(model, true)[0]?.object ?? null, byMesh);
    };
    let down: { x: number; y: number } | undefined;
    let current: Hotspot | undefined;
    const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY });
    const onMove = (e: PointerEvent) => {
      const h = pick(e);
      if (h === current) return;
      current = h;
      highlight(glow, h);
      setHovered(h ?? null);
      renderer.domElement.style.cursor = h ? "pointer" : "grab";
      callbacks.current.onHover?.(h ?? null);
    };
    const onUp = (e: PointerEvent) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > CLICK_SLOP) return;
      const h = pick(e);
      if (h) callbacks.current.onSelect?.(h);
    };
    const onLeave = () => {
      current = undefined;
      highlight(glow, undefined);
      setHovered(null);
      callbacks.current.onHover?.(null);
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("pointerleave", onLeave);

    const resize = new ResizeObserver(() => {
      renderer.setSize(width(), height());
      camera.aspect = width() / height();
      camera.updateProjectionMatrix();
    });
    resize.observe(el);
    renderer.setAnimationLoop(() => {
      controls.update();
      renderer.render(world, camera);
    });

    return () => {
      disposed = true;
      resize.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("pointerleave", onLeave);
      world.environment?.dispose();
      world.traverse((o) => {
        if (o instanceof Mesh) {
          o.geometry.dispose();
          for (const m of [o.material].flat()) m.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [scene, modelUrl]);

  return (
    <div className="relative w-full">
      <div ref={host} className={state === "ready" ? "w-full" : "absolute inset-0 opacity-0"} />
      {state !== "ready" && poster}
      {state === "failed" && <p className="text-sm text-zinc-400">The 3D model could not be loaded; showing the picture instead.</p>}
      <p aria-live="polite" className="sr-only">
        {hovered ? hotspotLabel(hovered) : ""}
      </p>
    </div>
  );
}
