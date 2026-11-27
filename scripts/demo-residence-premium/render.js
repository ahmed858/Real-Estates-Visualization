// Rendering helpers for the generator page (browser module): a renderer with
// soft shadows and filmic tone mapping, still pictures from a camera, and
// equirectangular panoramas from a cube camera.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export function createRenderer(width, height) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(renderer.domElement);
  return renderer;
}

/** Soft image-based light from a neutral room, so shaded sides never go black. */
export function roomEnvironment(renderer, intensity = 1) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  env.userData.intensity = intensity;
  return env;
}

export function sun(scene, { position, target = [0, 0, 0], intensity = 3, size = 30, color = 0xfff1dd, mapSize = 4096 }) {
  const light = new THREE.DirectionalLight(color, intensity);
  light.position.set(...position);
  light.target.position.set(...target);
  light.castShadow = true;
  light.shadow.mapSize.set(mapSize, mapSize);
  const c = light.shadow.camera;
  c.left = c.bottom = -size;
  c.right = c.top = size;
  c.near = 0.5;
  c.far = 400;
  light.shadow.bias = -0.0004;
  light.shadow.normalBias = 0.03;
  light.shadow.radius = 4;
  scene.add(light, light.target);
  return light;
}

export function still(renderer, scene, camera, width, height, quality = 0.86) {
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  return renderer.domElement.toDataURL("image/jpeg", quality);
}

/**
 * Renders the scene around `position` into a cube map and unwraps it to a
 * width x width/2 equirectangular picture in three.js's own convention (the
 * same one `EquirectangularReflectionMapping` reads), so the viewer shows it
 * without any correction. The picture is turned so that its centre column
 * looks along `look`: the viewer opens on the centre.
 */
export function panorama(renderer, scene, position, width, look = [1, 0, 0], quality = 0.86) {
  const cubeTarget = new THREE.WebGLCubeRenderTarget(Math.min(2048, width / 2), { type: THREE.HalfFloatType, generateMipmaps: false });
  const cube = new THREE.CubeCamera(0.05, 2000, cubeTarget);
  cube.position.set(...position);
  scene.add(cube);
  cube.update(renderer, scene);
  scene.remove(cube);
  const quad = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms: { cube: { value: cubeTarget.texture }, yaw: { value: Math.atan2(look[2], look[0]) } },
      vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
      fragmentShader: `
        uniform samplerCube cube;
        uniform float yaw;
        varying vec2 vUv;
        #define PI 3.141592653589793
        void main() {
          float phi = (vUv.x - 0.5) * 2.0 * PI + yaw;
          float theta = (vUv.y - 0.5) * PI;
          vec3 dir = vec3(cos(theta) * cos(phi), sin(theta), cos(theta) * sin(phi));
          gl_FragColor = textureCube(cube, dir);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      toneMapped: true,
      depthTest: false,
    }),
  );
  const flat = new THREE.Scene();
  flat.add(quad);
  renderer.setSize(width, width / 2);
  renderer.render(flat, new THREE.Camera());
  const url = renderer.domElement.toDataURL("image/jpeg", quality);
  cubeTarget.dispose();
  return url;
}

/**
 * The sky as a large inverted sphere rather than scene.background: a cube
 * camera draws the background per face and leaves visible seams in the
 * clouds, a mesh does not.
 */
export function skyDome(scene, texture, radius = 900) {
  const geometry = new THREE.SphereGeometry(radius, 64, 32);
  geometry.scale(-1, 1, 1);
  texture.mapping = THREE.UVMapping;
  const dome = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: texture, depthWrite: false, fog: false }));
  dome.name = "sky";
  scene.add(dome);
  return dome;
}
