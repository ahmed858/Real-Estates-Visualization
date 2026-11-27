// Pictures of the 3D building (browser module): the viewer's poster, shown
// before the model loads and on devices without WebGL.
import * as THREE from "three";
import { FLOOR_HEIGHT, FOOTPRINT, PLINTH } from "./building.js";
import { createRenderer, roomEnvironment, still, sun } from "./render.js";

export function buildingScene(model, renderer) {
  const scene = new THREE.Scene();
  // The viewer draws the model on the dark page, so the poster uses the same backdrop.
  scene.background = new THREE.Color(0x18181b);
  scene.environment = roomEnvironment(renderer);
  scene.environmentIntensity = 0.55;
  scene.add(new THREE.HemisphereLight(0xdfeeff, 0x8a7a60, 0.6));
  sun(scene, { position: [38, 52, -30], intensity: 3.2, size: 36 });
  scene.add(model);
  return scene;
}

export const POSTER_SIZE = { width: 1600, height: 1080 };

/** The camera the 3D viewer opens with (see model-3d-canvas.tsx), for a picture of this size. */
function viewerCamera(model, width, height) {
  const box = new THREE.Box3().setFromObject(model);
  const centre = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3()).length();
  const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 2000);
  camera.position.copy(centre).add(new THREE.Vector3(size * 0.6, size * 0.45, size * 0.8));
  camera.lookAt(centre);
  camera.updateMatrixWorld();
  return camera;
}

/** The poster: the same three-quarter view the 3D viewer opens with. */
export function buildingPoster(model, { width, height } = POSTER_SIZE) {
  const renderer = createRenderer(width, height);
  const scene = buildingScene(model, renderer);
  const camera = viewerCamera(model, width, height);
  const url = still(renderer, scene, camera, width, height);
  renderer.dispose();
  renderer.domElement.remove();
  return url;
}

/**
 * The outline of each floor on the poster, in poster pixels: the two facades
 * the opening camera sees (south and east) between the floor's slabs, as a
 * hexagon. Neighbouring floors share an edge, so the polygons do not
 * overlap. Returns JSON: { "<floor id>": [[x, y], ...] }.
 */
export function floorOutlines(model, floorIds, { width, height } = POSTER_SIZE) {
  const camera = viewerCamera(model, width, height);
  const { x0, x1, z0, z1 } = FOOTPRINT;
  const px = (x, y, z) => {
    const v = new THREE.Vector3(x, y, z).project(camera);
    return [Math.round(((v.x + 1) / 2) * width), Math.round(((1 - v.y) / 2) * height)];
  };
  const out = {};
  floorIds.forEach((id, i) => {
    const y0 = i === 0 ? 0 : PLINTH + i * FLOOR_HEIGHT;
    const y1 = PLINTH + (i + 1) * FLOOR_HEIGHT;
    out[id] = [px(x0, y0, z1), px(x1, y0, z1), px(x1, y0, z0), px(x1, y1, z0), px(x1, y1, z1), px(x0, y1, z1)];
  });
  return JSON.stringify(out);
}
