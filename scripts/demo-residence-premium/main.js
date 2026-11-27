// Entry of the generator page: window.generate(job) builds one asset and
// returns it as a data URL (pictures) or base64 (the .glb model).
import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { buildResidence, FLOOR_IDS } from "./building.js";
import { buildingPoster, floorOutlines } from "./building-shots.js";
import { livingRoom, masterBedroom } from "./interiors.js";
import { rooftop } from "./rooftop.js";
import { createRenderer, panorama, still } from "./render.js";

async function exportGlb(object) {
  const buffer = await new GLTFExporter().parseAsync(object, { binary: true, maxTextureSize: 256 });
  let s = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/** Panorama width; the cube faces are half of it. */
const PANORAMA_WIDTH = 4096;

function withRenderer(width, height, draw) {
  const renderer = createRenderer(width, height);
  try {
    return draw(renderer);
  } finally {
    renderer.dispose();
    renderer.domElement.remove();
  }
}

const views = { "living-a": livingRoom, "bedroom-b": masterBedroom, rooftop };

const panoramaJob = (name) => () => withRenderer(PANORAMA_WIDTH, PANORAMA_WIDTH / 2, (r) => {
  const { scene, camera, look } = views[name](r);
  return panorama(r, scene, camera, PANORAMA_WIDTH, look);
});

/** Poster of a panorama: a normal photo from the same spot, looking where the viewer opens. */
const posterJob = (name) => () => withRenderer(1600, 900, (r) => {
  const { scene, camera, look } = views[name](r);
  const cam = new THREE.PerspectiveCamera(75, 16 / 9, 0.05, 1000);
  cam.position.set(...camera);
  cam.lookAt(camera[0] + look[0], camera[1] + look[1], camera[2] + look[2]);
  return still(r, scene, cam, 1600, 900);
});

const jobs = {
  model: () => exportGlb(buildResidence()),
  "building-poster": () => buildingPoster(buildResidence()),
  "floor-outlines": () => btoa(floorOutlines(buildResidence(), FLOOR_IDS)),
};
for (const name of Object.keys(views)) {
  jobs[`panorama-${name}`] = panoramaJob(name);
  jobs[`poster-${name}`] = posterJob(name);
}

window.generate = async (job) => {
  const run = jobs[job];
  if (!run) throw new Error(`unknown job ${job}`);
  return run();
};
