"use client";
// The WebGL globe (three.js), loaded on demand by GlobeIntro so pages without
// the intro ship no 3D code and the intro's first paint does not wait for it.
// A sphere wrapped in a texture painted from the country shapes, a soft
// atmosphere, a star field and a sun light. The view owns the camera's
// flight; this only draws the pose it is given and puts the marker on the
// project. It draws on demand (one frame per pose), not in a loop.
// Browser-only; not unit tested (no WebGL in tests): the maths lives in the
// domain module and world-map.ts.
import { useEffect, useRef } from "react";
import {
  AdditiveBlending,
  AmbientLight,
  BackSide,
  BufferGeometry,
  CanvasTexture,
  DirectionalLight,
  Float32BufferAttribute,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from "three";
import { countryAt, facesCamera, latLngToVector, type CameraPose } from "@/modules/domain";
import { placeMarker, type GlobeRendererProps } from "./globe-renderer";
import { paintWorld } from "./world-texture";
import { CITY_PATCH_SPAN_DEG, paintCityPatch, seedOf } from "./city-texture";
import { loadCountries } from "./world-shapes";

const ATMOSPHERE_VERTEX = `
varying vec3 vNormal;
void main() {
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const ATMOSPHERE_FRAGMENT = `
varying vec3 vNormal;
void main() {
  float glow = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
  gl_FragColor = vec4(0.36, 0.62, 1.0, 1.0) * glow;
}`;

function starField(count: number): Points {
  const positions: number[] = [];
  for (let i = 0; i < count; i++) {
    // Uniform on a far sphere.
    const u = Math.random() * 2 - 1;
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(1 - u * u) * 60;
    positions.push(r * Math.cos(a), u * 60, r * Math.sin(a));
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  return new Points(geometry, new PointsMaterial({ color: 0xffffff, size: 1.3, sizeAttenuation: false, transparent: true, opacity: 0.75 }));
}

export default function GlobeCanvas({ target, shapesUrl, accent, markerRef, handleRef, onReady, onFail }: GlobeRendererProps) {
  const host = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onReady, onFail });
  useEffect(() => {
    callbacks.current = { onReady, onFail };
  });

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      callbacks.current.onFail();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.domElement.className = "block h-full w-full";
    renderer.domElement.setAttribute("aria-hidden", "true");
    el.appendChild(renderer.domElement);

    const world = new Scene();
    const camera = new PerspectiveCamera(40, 1, 0.001, 200);
    world.add(new AmbientLight(0xffffff, 0.55));
    const sun = new DirectionalLight(0xfff4e0, 2.1);
    world.add(sun);

    const canvas = document.createElement("canvas");
    // 4096 px wide on large screens (about 10 km a pixel at the equator), 2048 on phones to spare memory.
    const big = renderer.capabilities.maxTextureSize >= 4096 && Math.min(window.innerWidth, window.innerHeight) >= 700;
    canvas.width = big ? 4096 : 2048;
    canvas.height = canvas.width / 2;
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const earth = new Mesh(new SphereGeometry(1, 128, 96), new MeshStandardMaterial({ map: texture, roughness: 0.92, metalness: 0 }));
    world.add(earth);
    const atmosphere = new Mesh(
      new SphereGeometry(1.12, 64, 48),
      new ShaderMaterial({ vertexShader: ATMOSPHERE_VERTEX, fragmentShader: ATMOSPHERE_FRAGMENT, side: BackSide, blending: AdditiveBlending, transparent: true, depthWrite: false }),
    );
    world.add(atmosphere);
    const stars = starField(1800);
    world.add(stars);

    // The generated close-up of the city, a curved square of the sphere around the project.
    const patchCanvas = document.createElement("canvas");
    patchCanvas.width = patchCanvas.height = big ? 2048 : 1024;
    paintCityPatch(patchCanvas, seedOf(target.lat, target.lng), accent);
    const patchTexture = new CanvasTexture(patchCanvas);
    patchTexture.colorSpace = SRGBColorSpace;
    patchTexture.anisotropy = texture.anisotropy;
    const RAD = Math.PI / 180;
    const latSpan = CITY_PATCH_SPAN_DEG;
    const lngSpan = latSpan / Math.max(0.2, Math.cos(target.lat * RAD));
    const patch = new Mesh(
      new SphereGeometry(1.0002, 48, 48, (target.lng - lngSpan + 180) * RAD, 2 * lngSpan * RAD, (90 - target.lat - latSpan) * RAD, 2 * latSpan * RAD),
      new MeshStandardMaterial({ map: patchTexture, transparent: true, roughness: 0.92, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
    );
    world.add(patch);

    const projectAt = new Vector3(...latLngToVector(target));
    let pose: CameraPose | undefined;
    const size = () => ({ w: el.clientWidth || 1, h: el.clientHeight || 1 });

    const draw = () => {
      if (!pose) return;
      const { w, h } = size();
      const [x, y, z] = pose.dir;
      camera.position.set(x * (1 + pose.altitude), y * (1 + pose.altitude), z * (1 + pose.altitude));
      camera.lookAt(0, 0, 0);
      camera.near = Math.max(0.0005, pose.altitude * 0.2);
      camera.updateProjectionMatrix();
      // The sun sits behind the camera's left shoulder, so the side facing the visitor is lit.
      const side = new Vector3(x, y, z).cross(new Vector3(0, 1, 0)).normalize();
      sun.position.set(x * 3 + side.x * 2, y * 3 + 2, z * 3 + side.z * 2);
      stars.position.copy(camera.position);
      // The atmosphere would fill the screen near the ground; fade it out below country level.
      atmosphere.visible = pose.altitude > 0.15;
      patch.visible = pose.altitude < 1;
      renderer.render(world, camera);
      if (facesCamera([projectAt.x, projectAt.y, projectAt.z], pose, 0)) {
        const ndc = projectAt.clone().project(camera);
        placeMarker(markerRef.current, { x: ((ndc.x + 1) / 2) * w, y: ((1 - ndc.y) / 2) * h });
      } else placeMarker(markerRef.current, null);
    };

    const resize = () => {
      const { w, h } = size();
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // Keep the whole globe in view on narrow (portrait) screens.
      camera.fov = w < h ? 40 + 20 * (1 - w / h) : 40;
      camera.updateProjectionMatrix();
      draw();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();

    let disposed = false;
    loadCountries(shapesUrl)
      .then((countries) => {
        if (disposed) return;
        paintWorld(canvas, countries, countryAt(countries, [target.lng, target.lat]), accent);
        texture.needsUpdate = true;
        handleRef.current = {
          setPose(next) {
            pose = next;
            draw();
          },
        };
        callbacks.current.onReady();
      })
      .catch(() => {
        if (!disposed) callbacks.current.onFail();
      });

    return () => {
      disposed = true;
      handleRef.current = null;
      observer.disconnect();
      world.traverse((o) => {
        if (o instanceof Mesh || o instanceof Points) {
          o.geometry.dispose();
          [o.material].flat().forEach((m) => m.dispose());
        }
      });
      texture.dispose();
      patchTexture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [target, shapesUrl, accent, markerRef, handleRef]);

  return <div ref={host} className="absolute inset-0" data-testid="globe-canvas" />;
}
