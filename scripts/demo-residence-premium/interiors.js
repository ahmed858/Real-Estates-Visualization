// The interior panoramas (browser module): the living room of a three-bedroom
// apartment (type A) and the master bedroom of a two-bedroom apartment
// (type B), furnished, lit by the sun through the windows and by ceiling
// lights, with the garden, the neighbouring blocks and the sky outside.
import * as THREE from "three";
import { Batch, material, random } from "./kit.js";
import { bed, coffeeTable, curtain, diningSet, floorLamp, frame, pendant, plant, rug, sideTable, sofa } from "./furniture.js";
import { fabric, grass, painting, parquet, plaster, rug as rugTexture, tiles } from "./textures.js";
import { roomEnvironment, skyDome, sun } from "./render.js";
import { skyTexture } from "./textures.js";

function interiorMaterials() {
  return {
    wall: material("wall", { map: plaster([236, 230, 220], 51, 128), tile: 2, roughness: 0.95 }),
    accent: material("accent-wall", { map: plaster([196, 172, 146], 52, 128), tile: 2, roughness: 0.95 }),
    ceiling: material("ceiling", { color: 0xf4f1ec, roughness: 1 }),
    floor: material("parquet", { map: parquet(53), tile: 2.4, roughness: 0.55 }),
    skirting: material("skirting", { color: 0xe9e4da, roughness: 0.6 }),
    glass: material("window-glass", { color: 0xdfeaf2, roughness: 0.05, metalness: 0.1, opacity: 0.12 }),
    frameAlu: material("window-frame", { color: 0x2f3134, roughness: 0.4, metalness: 0.6 }),
    fabric: material("sofa-fabric", { map: fabric([150, 146, 138], 54), tile: 0.5, roughness: 1 }),
    fabric2: material("chair-fabric", { map: fabric([196, 178, 150], 55), tile: 0.5, roughness: 1 }),
    linen: material("linen", { map: fabric([242, 238, 230], 56), tile: 0.5, roughness: 1 }),
    throw: material("throw", { map: fabric([176, 98, 64], 57), tile: 0.5, roughness: 1 }),
    wood: material("walnut", { map: parquet(58, [116, 78, 52]), tile: 1.5, roughness: 0.5 }),
    slats: material("wood-slats", { color: 0x7a5236, roughness: 0.6 }),
    metal: material("black-metal", { color: 0x1d1d1f, roughness: 0.35, metalness: 0.8 }),
    ceramic: material("ceramic", { color: 0xece8e1, roughness: 0.35 }),
    book: material("book", { color: 0x2f4a5c, roughness: 0.7 }),
    leaf: material("leaf", { color: 0x3f6b2c, roughness: 0.8, side: THREE.DoubleSide }),
    trunk: material("stem", { color: 0x4b3a28, roughness: 1 }),
    shade: material("lamp-shade", { color: 0xf3e6cc, roughness: 0.9, emissive: 0xffd9a0, emissiveIntensity: 0.6, side: THREE.DoubleSide }),
    pendant: material("pendant", { color: 0xc9a46a, roughness: 0.3, metalness: 0.9, side: THREE.DoubleSide }),
    bulb: material("bulb", { color: 0xffffff, emissive: 0xffe3b0, emissiveIntensity: 6 }),
    cove: material("cove-light", { color: 0xffffff, emissive: 0xffe6c0, emissiveIntensity: 2.2 }),
    frameWood: material("picture-frame", { color: 0x2a2420, roughness: 0.5 }),
    tv: material("tv", { color: 0x0b0c0e, roughness: 0.15, metalness: 0.5 }),
    curtainFabric: material("curtain", { map: fabric([226, 214, 196], 60), tile: 0.6, roughness: 1, side: THREE.DoubleSide }),
    rail: material("balcony-rail", { color: 0x4a4a4c, roughness: 0.45, metalness: 0.6 }),
    balcony: material("balcony-floor", { map: tiles([196, 182, 164], "#8d7f6d", 61, 4, 10), tile: 1.2, roughness: 0.9 }),
    facade: material("facade", { map: plaster([122, 94, 80], 62), tile: 3, roughness: 0.92 }),
    beige: material("beige", { map: plaster([222, 204, 172], 63), tile: 3, roughness: 0.85 }),
  };
}

/**
 * Walls of a w x d x h room (x 0..w, z 0..d) with openings cut out. Each
 * opening is on a wall ("n" z=0, "s" z=d, "w" x=0, "e" x=w) from u0 to u1
 * along it, between heights y0 and y1, and is glazed unless `open`.
 */
function shell(b, m, { w, d, h, openings, wallMaterial = {} }) {
  const t = 0.22;
  const walls = { n: w, s: w, w: d, e: d };
  for (const [side, length] of Object.entries(walls)) {
    const mat = wallMaterial[side] ?? m.wall;
    const holes = openings.filter((o) => o.wall === side).sort((a, b2) => a.u0 - b2.u0);
    const put = (mm, u0, u1, y0, y1, inset = 0, depth = t) => {
      if (side === "n") b.box(mm, u0, y0, -depth + inset, u1, y1, inset);
      if (side === "s") b.box(mm, u0, y0, d - inset, u1, y1, d + depth - inset);
      if (side === "w") b.box(mm, -depth + inset, y0, u0, inset, y1, u1);
      if (side === "e") b.box(mm, w - inset, y0, u0, w + depth - inset, y1, u1);
    };
    let u = 0;
    for (const o of holes) {
      if (o.u0 > u) put(mat, u, o.u0, 0, h);
      if (o.y0 > 0) put(mat, o.u0, o.u1, 0, o.y0);
      if (o.y1 < h) put(mat, o.u0, o.u1, o.y1, h);
      if (!o.open) {
        // Frame, a centre mullion and the glass, set in the middle of the wall.
        const f = 0.05;
        put(m.frameAlu, o.u0, o.u1, o.y0, o.y0 + f, -t / 2 + 0.04, 0.08);
        put(m.frameAlu, o.u0, o.u1, o.y1 - f, o.y1, -t / 2 + 0.04, 0.08);
        put(m.frameAlu, o.u0, o.u0 + f, o.y0, o.y1, -t / 2 + 0.04, 0.08);
        put(m.frameAlu, o.u1 - f, o.u1, o.y0, o.y1, -t / 2 + 0.04, 0.08);
        put(m.frameAlu, (o.u0 + o.u1) / 2 - f / 2, (o.u0 + o.u1) / 2 + f / 2, o.y0, o.y1, -t / 2 + 0.04, 0.08);
        put(m.glass, o.u0, o.u1, o.y0, o.y1, -t / 2 + 0.02, 0.01);
      }
      u = o.u1;
    }
    if (u < length) put(mat, u, length, 0, h);
    // Skirting along the solid parts.
    let s0 = 0;
    for (const o of [...holes.filter((o) => o.y0 === 0), { u0: length, u1: length }]) {
      if (o.u0 > s0) put(m.skirting, s0, o.u0, 0, 0.09, 0.012, 0.012);
      s0 = o.u1;
    }
  }
  b.box(m.floor, -t, -0.1, -t, w + t, 0, d + t);
  b.box(m.ceiling, -t, h, -t, w + t, h + 0.1, d + t);
}

/** Dropped ceiling border with a glowing cove, inset from the walls. */
function coveCeiling(b, m, { w, d, h, inset = 0.6, drop = 0.18 }) {
  const y = h - drop;
  b.box(m.ceiling, 0, y, 0, w, h, inset);
  b.box(m.ceiling, 0, y, d - inset, w, h, d);
  b.box(m.ceiling, 0, y, inset, inset, h, d - inset);
  b.box(m.ceiling, w - inset, y, inset, w, h, d - inset);
  const g = 0.03;
  b.box(m.cove, inset, h - 0.02, inset, w - inset, h - 0.01, inset + g);
  b.box(m.cove, inset, h - 0.02, d - inset - g, w - inset, h - 0.01, d - inset);
  b.box(m.cove, inset, h - 0.02, inset, inset + g, h - 0.01, d - inset);
  b.box(m.cove, w - inset - g, h - 0.02, inset, w - inset, h - 0.01, d - inset);
}

/** What the windows look onto: the garden below, neighbouring blocks and the sky. */
function outside(scene, { elevation, seed, origin }) {
  const m = {
    lawn: material("lawn", { map: grass(71), tile: 4 }),
    paving: material("paving", { map: tiles([205, 178, 160], "#a58f7e", 72, 6, 22), tile: 2 }),
    blockA: material("block-a", { map: plaster([140, 108, 92], 73), tile: 3, roughness: 0.9 }),
    blockB: material("block-b", { map: plaster([210, 192, 160], 74), tile: 3, roughness: 0.9 }),
    win: material("block-windows", { color: 0x3c4a56, roughness: 0.2, metalness: 0.4 }),
    leaves: material("trees", { color: 0x4f7a32, roughness: 0.9 }),
    trunk: material("trunks", { color: 0x5b4330, roughness: 1 }),
  };
  const b = new Batch("outside");
  const [ox, oz] = origin;
  const y0 = -elevation;
  b.box(m.paving, ox - 200, y0 - 0.1, oz - 200, ox + 200, y0, oz + 200, 2);
  const rnd = random(seed);
  for (let i = 0; i < 18; i++) {
    const a = rnd() * Math.PI * 2, r = 25 + rnd() * 90;
    const x = ox + Math.cos(a) * r, z = oz + Math.sin(a) * r;
    b.box(m.lawn, x - 6, y0, z - 6, x + 6, y0 + 0.05, z + 6, 4);
  }
  // Neighbouring blocks: brown and beige boxes with window bands, leaving the view in front open.
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2, r = 70 + rnd() * 110;
    const x = ox + Math.cos(a) * r, z = oz + Math.sin(a) * r;
    const w = 18 + rnd() * 16, dd = 14 + rnd() * 8, hh = 15 + Math.round(rnd() * 3) * 3.2;
    const mat = rnd() > 0.45 ? m.blockA : m.blockB;
    b.box(mat, x - w / 2, y0, z - dd / 2, x + w / 2, y0 + hh, z + dd / 2);
    for (let f = 1; f * 3.2 < hh - 1; f++) {
      const yy = y0 + f * 3.2 - 1.6;
      b.box(m.win, x - w / 2 + 1, yy - 0.7, z - dd / 2 - 0.05, x + w / 2 - 1, yy + 0.7, z + dd / 2 + 0.05);
      b.box(m.win, x - w / 2 - 0.05, yy - 0.7, z - dd / 2 + 1, x + w / 2 + 0.05, yy + 0.7, z + dd / 2 - 1);
    }
  }
  const leaf = new THREE.IcosahedronGeometry(1, 1);
  for (let i = 0; i < 60; i++) {
    const a = rnd() * Math.PI * 2, r = 10 + rnd() * 45;
    const x = ox + Math.cos(a) * r, z = oz + Math.sin(a) * r;
    const hh = 3 + rnd() * 4;
    b.shape(m.trunk, new THREE.CylinderGeometry(0.12, 0.2, hh, 6), { position: [x, y0 + hh / 2, z] });
    const s = 1.6 + rnd() * 1.6;
    b.shape(m.leaves, leaf, { position: [x, y0 + hh + s * 0.4, z], scale: [s, s * 0.85, s] });
  }
  scene.add(b.build());
}

function baseScene(renderer, { sunPosition, sunTarget, skySeed }) {
  const scene = new THREE.Scene();
  skyDome(scene, skyTexture({ seed: skySeed, sunAzimuth: 0.62, sunElevation: 0.75 }));
  scene.environment = roomEnvironment(renderer);
  scene.environmentIntensity = 0.35;
  scene.add(new THREE.HemisphereLight(0xe6f0ff, 0x9a8466, 0.35));
  sun(scene, { position: sunPosition, target: sunTarget, intensity: 4.2, size: 12, mapSize: 4096 });
  return scene;
}

function warmLight(scene, x, y, z, intensity = 3, distance = 7) {
  const l = new THREE.PointLight(0xffd8a8, intensity, distance, 1.6);
  l.position.set(x, y, z);
  scene.add(l);
}

/** Living and dining room of apartment A (48 m²), with the balcony through the sliding door. */
export function livingRoom(renderer) {
  const W = 8.1, D = 6.0, H = 2.9;
  const scene = baseScene(renderer, { sunPosition: [-34, 30, -26], sunTarget: [W / 2, 0, D / 2], skySeed: 81 });
  const m = interiorMaterials();
  const b = new Batch("living");
  shell(b, m, {
    w: W, d: D, h: H,
    openings: [
      { wall: "n", u0: 1.5, u1: 5.1, y0: 0, y1: 2.45 },
      { wall: "w", u0: 2.0, u1: 3.8, y0: 0.9, y1: 2.45 },
      { wall: "e", u0: 0.6, u1: 1.6, y0: 0, y1: 2.2, open: true },
    ],
    wallMaterial: { s: m.accent },
  });
  coveCeiling(b, m, { w: W, d: D, h: H });
  // Balcony behind the sliding door.
  b.box(m.balcony, 0.2, -0.15, -1.72, 6.45, -0.02, -0.22);
  b.box(m.rail, 0.2, 1.0, -1.72, 6.45, 1.05, -1.66);
  for (let x = 0.2; x <= 6.46; x += 0.12) b.box(m.rail, x - 0.012, -0.02, -1.71, x + 0.012, 1.0, -1.68);
  b.box(m.beige, -0.15, -0.15, -1.82, 0.2, H, -0.22);
  b.box(m.beige, 6.45, -0.15, -1.82, 6.8, H, -0.22);
  b.box(m.beige, -0.15, H, -1.82, 6.8, H + 0.3, -0.22);
  // Hallway beyond the east doorway.
  b.box(m.wall, W + 0.22, 0, -0.4, W + 1.6, H, 0.6);
  b.box(m.wall, W + 0.22, 0, 1.6, W + 1.6, H, 2.6);
  b.box(m.wall, W + 1.6, 0, 0.6, W + 1.8, H, 1.6);
  b.box(m.floor, W, -0.1, 0.6, W + 1.6, 0, 1.6);
  b.box(m.ceiling, W, H, -0.4, W + 1.8, H + 0.1, 2.6);
  // TV wall: walnut slats behind a low console and the screen.
  for (let x = 1.6; x < 5.4; x += 0.11) b.box(m.slats, x, 0.09, D - 0.05, x + 0.07, H - 0.18, D);
  b.box(m.wood, 2.0, 0.18, D - 0.45, 5.0, 0.58, D - 0.05);
  b.box(m.metal, 2.05, 0.0, D - 0.42, 2.1, 0.18, D - 0.38);
  b.box(m.metal, 4.9, 0.0, D - 0.42, 4.95, 0.18, D - 0.38);
  b.box(m.tv, 2.6, 1.0, D - 0.1, 4.4, 2.02, D - 0.06);
  b.box(m.metal, 2.62, 1.02, D - 0.105, 4.38, 2.0, D - 0.1);
  // Seating group.
  rug(b, material("rug", { map: rugTexture([214, 204, 188], "#8c6f55", 82), tile: 1 }), { x: 3.5, z: 3.4, w: 3.4, d: 2.5 });
  sofa(b, m, { x: 3.5, z: 2.3, w: 2.8, d: 0.98, rot: 0 });
  sofa(b, { ...m, fabric: m.fabric2 }, { x: 1.2, z: 3.7, w: 0.95, d: 0.9, rot: Math.PI / 2 });
  coffeeTable(b, m, { x: 3.5, z: 3.55 });
  floorLamp(b, m, { x: 1.4, z: 1.9 });
  plant(b, m, { x: 0.45, z: 5.5, h: 1.7, pot: 0.24 });
  plant(b, m, { x: 5.4, z: 0.4, h: 1.3, pot: 0.2 });
  // Dining corner.
  diningSet(b, m, { x: 6.6, z: 4.4, w: 1.6, d: 0.9, chairs: 4 });
  pendant(b, m, { x: 6.2, z: 4.4, ceiling: H, drop: 0.85 });
  pendant(b, m, { x: 7.0, z: 4.4, ceiling: H, drop: 0.85 });
  // Art and curtains.
  frame(b, m, material("art-1", { map: painting(["#efe6d8", "#c47a4f", "#2f4a5c", "#d9b26b"], 83) }), { x: W, y: 1.65, z: 4.4, w: 1.1, h: 0.8, normal: "-x" });
  frame(b, m, material("art-2", { map: painting(["#ece4da", "#7d8f6a", "#b5643f"], 84) }), { x: 0, y: 1.6, z: 5.0, w: 0.6, h: 0.8, normal: "+x" });
  curtain(b, m.curtainFabric, { x0: 0.9, x1: 1.5, z: 0.12, top: 2.75 });
  curtain(b, m.curtainFabric, { x0: 5.1, x1: 5.7, z: 0.12, top: 2.75 });
  scene.add(b.build());
  warmLight(scene, 3.5, H - 0.3, 3.0, 2.2, 8);
  warmLight(scene, 6.6, 1.9, 4.4, 2.0, 4);
  warmLight(scene, 1.4, 1.6, 1.9, 1.2, 3);
  outside(scene, { elevation: 0.45 + 3 * 3.2, seed: 85, origin: [W / 2, D / 2] });
  return { scene, camera: [4.9, 1.5, 4.7], look: [-1, -0.12, -0.75] };
}

/** Master bedroom of apartment B (29 m²), with the window onto the balcony. */
export function masterBedroom(renderer) {
  const W = 5.6, D = 5.2, H = 2.9;
  const scene = baseScene(renderer, { sunPosition: [26, 32, -30], sunTarget: [W / 2, 0, D / 2], skySeed: 91 });
  const m = interiorMaterials();
  const b = new Batch("bedroom");
  shell(b, m, {
    w: W, d: D, h: H,
    openings: [
      { wall: "n", u0: 1.2, u1: 4.0, y0: 0, y1: 2.45 },
      { wall: "w", u0: 0.6, u1: 1.5, y0: 0, y1: 2.2, open: true },
    ],
    wallMaterial: { s: m.accent },
  });
  coveCeiling(b, m, { w: W, d: D, h: H, inset: 0.5 });
  b.box(m.balcony, 0.4, -0.15, -1.72, 5.4, -0.02, -0.22);
  b.box(m.rail, 0.4, 1.0, -1.72, 5.4, 1.05, -1.66);
  for (let x = 0.4; x <= 5.41; x += 0.12) b.box(m.rail, x - 0.012, -0.02, -1.71, x + 0.012, 1.0, -1.68);
  b.box(m.beige, 5.4, -0.15, -1.82, 5.75, H, -0.22);
  // Corridor beyond the door.
  b.box(m.wall, -1.6, 0, -0.4, -0.22, H, 0.6);
  b.box(m.wall, -1.6, 0, 1.5, -0.22, H, 2.4);
  b.box(m.wall, -1.8, 0, 0.6, -1.6, H, 1.5);
  b.box(m.floor, -1.6, -0.1, 0.6, 0, 0, 1.5);
  b.box(m.ceiling, -1.8, H, -0.4, 0, H + 0.1, 2.4);
  // Upholstered wall panel behind the bed.
  for (let x = 1.0; x < 4.6; x += 0.45) b.box(m.fabric2, x + 0.01, 0.6, D - 0.06, x + 0.44, 2.1, D);
  rug(b, material("rug", { map: rugTexture([196, 188, 176], "#5f6a72", 92), tile: 1 }), { x: 2.8, z: 3.6, w: 2.8, d: 2.6 });
  bed(b, m, { x: 2.8, z: D - 1.2, w: 1.8, l: 2.1, rot: Math.PI });
  sideTable(b, m, { x: 1.45, z: D - 0.35 });
  sideTable(b, m, { x: 4.15, z: D - 0.35 });
  // Wardrobe along the east wall with door lines and handles.
  b.box(m.wood, W - 0.62, 0, 0.6, W, 2.6, 3.4);
  for (let z = 0.6 + 0.7; z < 3.4; z += 0.7) b.box(m.metal, W - 0.63, 0.05, z - 0.005, W - 0.62, 2.55, z + 0.005);
  for (let z = 0.6 + 0.7; z < 3.4; z += 1.4) b.box(m.metal, W - 0.66, 1.0, z - 0.06, W - 0.63, 1.3, z - 0.04);
  // Dresser and mirror on the west wall.
  b.box(m.wood, 0, 0.0, 2.6, 0.5, 0.8, 4.0);
  b.box(m.frameWood, 0, 1.1, 2.9, 0.04, 2.1, 3.7);
  b.box(material("mirror", { color: 0xc9d3da, roughness: 0.08, metalness: 0.3 }), 0.04, 1.14, 2.94, 0.05, 2.06, 3.66);
  plant(b, m, { x: 0.45, z: 0.4, h: 1.5, pot: 0.22 });
  frame(b, m, material("art-3", { map: painting(["#f1ebe2", "#5f6a72", "#c9a46a"], 93) }), { x: 2.8, y: 2.45, z: D - 0.06, w: 1.4, h: 0.5, normal: "-z" });
  curtain(b, m.curtainFabric, { x0: 0.55, x1: 1.2, z: 0.12, top: 2.75 });
  curtain(b, m.curtainFabric, { x0: 4.0, x1: 4.65, z: 0.12, top: 2.75 });
  scene.add(b.build());
  warmLight(scene, 1.45, 0.9, D - 0.35, 1.4, 3);
  warmLight(scene, 4.15, 0.9, D - 0.35, 1.4, 3);
  warmLight(scene, 2.8, H - 0.3, 2.6, 1.6, 7);
  outside(scene, { elevation: 0.45 + 2 * 3.2, seed: 95, origin: [W / 2, D / 2] });
  return { scene, camera: [2.6, 1.5, 1.9], look: [0, -0.1, 1] };
}
