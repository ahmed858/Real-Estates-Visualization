// The rooftop panorama (browser module): standing on the roof of the
// residence, with a small terrace set up on it, among the other blocks of
// the compound (copies of the same building), gardens and the sky.
import * as THREE from "three";
import { buildResidence, FLOOR_HEIGHT, FLOOR_IDS, PLINTH } from "./building.js";
import { Batch, material } from "./kit.js";
import { place } from "./furniture.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { fabric, grass, parquet, tiles } from "./textures.js";
import { roomEnvironment, skyDome, sun } from "./render.js";
import { skyTexture } from "./textures.js";

const ROOF = PLINTH + FLOOR_IDS.length * FLOOR_HEIGHT + 0.15;

function terrace() {
  const m = {
    deck: material("deck", { map: parquet(101, [150, 106, 70]), tile: 1.2, roughness: 0.75 }),
    timber: material("pergola", { color: 0x6b4a32, roughness: 0.7 }),
    cushion: material("cushion", { map: fabric([232, 226, 214], 102), tile: 0.5, roughness: 1 }),
    planter: material("planter", { color: 0x3a3b3d, roughness: 0.6 }),
    shrub: material("shrub", { color: 0x4d7a30, roughness: 0.9 }),
    umbrella: material("umbrella", { color: 0xe9dfcc, roughness: 0.9, side: THREE.DoubleSide }),
  };
  const b = new Batch("terrace");
  b.box(m.deck, -14.8, ROOF, -9.5, -4.0, ROOF + 0.08, 1.5, 1.2);
  // Pergola: posts and slats over the lounge.
  for (const [x, z] of [[-14.2, -8.9], [-14.2, -2.9], [-8.2, -8.9], [-8.2, -2.9]]) b.box(m.timber, x - 0.08, ROOF, z - 0.08, x + 0.08, ROOF + 2.7, z + 0.08);
  for (const z of [-8.9, -2.9]) b.box(m.timber, -14.4, ROOF + 2.6, z - 0.08, -8.0, ROOF + 2.8, z + 0.08);
  for (let x = -14.2; x <= -8.2; x += 0.35) b.box(m.timber, x - 0.03, ROOF + 2.8, -9.2, x + 0.03, ROOF + 2.92, -2.6);
  const r = (w, h, d) => new RoundedBoxGeometry(w, h, d, 3, 0.05);
  // Lounge sofas and loungers.
  for (const [x, z, rot] of [[-11.2, -8.3, 0], [-13.6, -5.9, Math.PI / 2]]) {
    place(b, m.timber, r(2.4, 0.3, 0.85), x, z, rot, [0, 0.15 + ROOF, 0]);
    place(b, m.cushion, r(2.3, 0.18, 0.8), x, z, rot, [0, 0.39 + ROOF, 0]);
    place(b, m.cushion, r(2.3, 0.45, 0.18), x, z, rot, [0, 0.68 + ROOF, -0.32]);
  }
  b.box(m.timber, -11.8, ROOF, -6.4, -10.6, ROOF + 0.4, -5.4);
  for (const x of [-7.2, -5.6]) {
    place(b, m.timber, r(0.7, 0.25, 1.9), x, -0.2, 0, [0, 0.2 + ROOF, 0]);
    place(b, m.cushion, r(0.65, 0.1, 1.2), x, -0.2, 0, [0, 0.38 + ROOF, 0.3]);
    place(b, m.cushion, r(0.65, 0.1, 0.65), x, -0.2, 0, [0, 0.55 + ROOF, -0.6], [0.6, 0, 0]);
  }
  b.shape(m.timber, new THREE.CylinderGeometry(0.03, 0.03, 2.4, 8), { position: [-6.4, ROOF + 1.2, -1.4] });
  b.shape(m.umbrella, new THREE.ConeGeometry(1.5, 0.5, 16, 1, true), { position: [-6.4, ROOF + 2.45, -1.4] });
  // Planters along the parapet.
  for (let x = -14.6; x < -4.5; x += 1.6) {
    b.box(m.planter, x, ROOF, -10.0, x + 1.3, ROOF + 0.55, -9.6);
    b.shape(m.shrub, new THREE.IcosahedronGeometry(0.42, 1), { position: [x + 0.65, ROOF + 0.75, -9.8], scale: [1.4, 0.8, 0.6] });
  }
  return b.build();
}

/** The compound around the block: copies of the building, lawns, roads and trees. */
function compound(scene) {
  const block = buildResidence();
  block.remove(block.getObjectByName("site"));
  const spots = [[-46, -38, 0], [0, -46, 0], [46, -38, 0], [-52, 6, Math.PI / 2], [54, 4, Math.PI / 2], [-44, 48, 0], [2, 52, 0], [48, 46, 0], [-96, -10, 0], [98, -14, 0], [-20, -96, Math.PI / 2], [30, 100, 0]];
  for (const [x, z, rot] of spots) {
    const copy = block.clone();
    copy.position.set(x, 0, z);
    copy.rotation.y = rot;
    scene.add(copy);
  }
  const m = {
    lawn: material("lawn", { map: grass(111), tile: 4 }),
    road: material("road", { color: 0x55565a, roughness: 0.95 }),
    paving: material("paving", { map: tiles([205, 178, 160], "#a58f7e", 112, 6, 22), tile: 2 }),
    leaves: material("trees", { color: 0x4f7a32, roughness: 0.9 }),
    trunk: material("trunks", { color: 0x5b4330, roughness: 1 }),
    water: material("pool", { color: 0x3d9ec4, roughness: 0.05, metalness: 0.2 }),
  };
  const b = new Batch("compound");
  b.box(m.paving, -400, -0.1, -400, 400, 0, 400, 2);
  for (let i = -3; i <= 3; i++) {
    b.box(m.road, i * 50 - 25 - 4, 0, -400, i * 50 - 25 + 4, 0.02, 400);
    b.box(m.road, -400, 0, i * 50 - 25 - 4 + 3, 400, 0.02, i * 50 - 25 + 4 + 3);
  }
  for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) {
    const x = i * 50, z = j * 50 + 3;
    b.box(m.lawn, x - 19, 0.02, z - 19, x + 19, 0.06, z + 19, 4);
  }
  b.box(m.water, -10, 0.05, 24, 10, 0.12, 30);
  const leaf = new THREE.IcosahedronGeometry(1, 1);
  let k = 0;
  for (let i = -8; i <= 8; i++) for (let j = -8; j <= 8; j++) {
    if ((i * 7 + j * 13 + k++) % 3) continue;
    const x = i * 21 + ((j * 5) % 7), z = j * 21 + ((i * 3) % 5);
    if (Math.abs(x) < 22 && Math.abs(z) < 16) continue;
    const h = 3 + ((i * j) % 3);
    b.shape(m.trunk, new THREE.CylinderGeometry(0.12, 0.2, h, 6), { position: [x, h / 2, z] });
    b.shape(m.leaves, leaf, { position: [x, h + 1, z], scale: [2.2, 1.9, 2.2] });
  }
  scene.add(b.build());
}

export function rooftop(renderer) {
  const scene = new THREE.Scene();
  skyDome(scene, skyTexture({ seed: 121, sunAzimuth: 0.62, sunElevation: 0.62 }));
  scene.environment = roomEnvironment(renderer);
  scene.environmentIntensity = 0.5;
  scene.add(new THREE.HemisphereLight(0xdfeeff, 0x8a7a60, 0.6));
  sun(scene, { position: [-60, 80, 40], target: [0, 0, 0], intensity: 3.4, size: 120, mapSize: 8192 });
  scene.add(buildResidence());
  scene.add(terrace());
  compound(scene);
  return { scene, camera: [-9.5, ROOF + 1.6, -1.8], look: [-0.4, -0.1, -1] };
}
