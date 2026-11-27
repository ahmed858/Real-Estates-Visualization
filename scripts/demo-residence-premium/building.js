// The demo residence as a 3D model (browser module, three.js), built from
// the plan: 31.25 m x 20.6 m footprint (the plan's outer walls at 32 px per
// metre), ground floor plus five typical floors of 3.2 m, balcony bays where
// the typical plan has balconies, a central stair and lift core on the roof.
// Every floor is one group named after its scene id ("ground", "floor-1" …
// "floor-5"), so the viewer can link the group to the floor scene.
import * as THREE from "three";
import { Batch, material, random } from "./kit.js";
import { grass, plaster, stone, tiles } from "./textures.js";

export const FOOTPRINT = { x0: -15.625, x1: 15.625, z0: -10.3125, z1: 10.3125 };
export const FLOOR_HEIGHT = 3.2;
export const PLINTH = 0.45;
export const FLOOR_IDS = ["ground", "floor-1", "floor-2", "floor-3", "floor-4", "floor-5"];
/** Balcony bays along x (plan px 160-360 and 840-1040). */
const BAYS = [[-13.75, -7.5], [7.5, 13.75]];
const SLAB = 0.24;

export function buildingMaterials() {
  return {
    render: material("brown-render", { map: plaster([122, 94, 80], 11), tile: 3, roughness: 0.92 }),
    renderDark: material("dark-render", { map: plaster([104, 78, 66], 12), tile: 3, roughness: 0.92 }),
    beige: material("beige-render", { color: 0xd9c4a0, map: plaster([222, 204, 172], 13), tile: 3, roughness: 0.85 }),
    stone: material("stone-cladding", { map: stone(14), tile: 2.4, roughness: 0.95 }),
    glass: material("glass", { color: 0x51677a, roughness: 0.12, metalness: 0.35 }),
    frame: material("window-frame", { color: 0xb7b3ac, roughness: 0.5, metalness: 0.3 }),
    rail: material("railing", { color: 0x4a4a4c, roughness: 0.45, metalness: 0.6 }),
    ac: material("ac-unit", { color: 0xe8e8e4, roughness: 0.6 }),
    concrete: material("roof-concrete", { color: 0xbdb3a2, map: plaster([200, 192, 178], 15), tile: 4, roughness: 0.95 }),
    tank: material("water-tank", { color: 0x2d5f86, roughness: 0.5 }),
    door: material("entrance-door", { color: 0x3a2b20, roughness: 0.55 }),
  };
}

function windowAt(b, m, face, u0, u1, y0, y1) {
  // face: "n" | "s" (u = x) or "e" | "w" (u = z); glass sits 4 cm proud of the wall, frame 8 cm.
  const { x0, x1, z0, z1 } = FOOTPRINT;
  const put = (mat, a0, a1, b0, b1, depth) => {
    if (face === "n") b.box(mat, a0, b0, z0 - depth, a1, b1, z0);
    if (face === "s") b.box(mat, a0, b0, z1, a1, b1, z1 + depth);
    if (face === "w") b.box(mat, x0 - depth, b0, a0, x0, b1, a1);
    if (face === "e") b.box(mat, x1, b0, a0, x1 + depth, b1, a1);
  };
  // Three boxes per window: the frame, the glass just in front of it, the sill.
  const f = 0.07;
  put(m.frame, u0 - f, u1 + f, y0 - f, y1 + f, 0.05);
  put(m.glass, u0, u1, y0, y1, 0.06);
  put(m.beige, u0 - 0.12, u1 + 0.12, y0 - 0.12, y0 - f, 0.14); // sill
}

function acUnit(b, m, face, u, y) {
  const { z0, z1, x0, x1 } = FOOTPRINT;
  if (face === "n") b.box(m.ac, u - 0.4, y, z0 - 0.3, u + 0.4, y + 0.55, z0);
  if (face === "s") b.box(m.ac, u - 0.4, y, z1, u + 0.4, y + 0.55, z1 + 0.3);
  if (face === "e") b.box(m.ac, x1, y, u - 0.4, x1 + 0.3, y + 0.55, u + 0.4);
  if (face === "w") b.box(m.ac, x0 - 0.3, y, u - 0.4, x0, y + 0.55, u + 0.4);
}

function railing(b, m, xa, xb, z, y, outward) {
  b.box(m.rail, xa, y + 1.0, z - 0.03, xb, y + 1.05, z + 0.03);
  b.box(m.rail, xa, y + 0.55, z - 0.015, xb, y + 0.58, z + 0.015);
  for (let x = xa; x <= xb + 1e-6; x += 0.9) b.box(m.rail, x - 0.025, y, z - 0.025, x + 0.025, y + 1.05, z + 0.025);
  void outward;
}

function sideRailing(b, m, x, za, zb, y) {
  b.box(m.rail, x - 0.03, y + 1.0, za, x + 0.03, y + 1.05, zb);
  b.box(m.rail, x - 0.015, y + 0.55, za, x + 0.015, y + 0.58, zb);
  for (let z = za; z <= zb + 1e-6; z += 0.8) b.box(m.rail, x - 0.025, y, z - 0.025, x + 0.025, y + 1.05, z + 0.025);
}

/** One floor: slab band, walls, windows, balconies and their frames. */
function floor(index, m) {
  const id = FLOOR_IDS[index];
  const b = new Batch(id);
  const { x0, x1, z0, z1 } = FOOTPRINT;
  const y = PLINTH + index * FLOOR_HEIGHT;
  const top = y + FLOOR_HEIGHT;
  const rnd = random(100 + index);
  const typical = index > 0;

  if (!typical) b.box(m.stone, x0 - 0.05, 0, z0 - 0.05, x1 + 0.05, PLINTH - SLAB / 2, z1 + 0.05);
  // Slab band, slightly proud of the walls, so floors read as layers.
  b.box(m.beige, x0 - 0.1, y - SLAB / 2, z0 - 0.1, x1 + 0.1, y + SLAB / 2, z1 + 0.1);
  // Walls: brown render, stone in the middle of the long facades, darker corners.
  b.box(typical ? m.render : m.stone, x0, y + SLAB / 2, z0, x1, top - SLAB / 2, z1);
  if (typical) {
    for (const z of [z0 - 0.06, z1]) b.box(m.stone, -3.6, y + SLAB / 2, z, 3.6, top - SLAB / 2, z + 0.06);
    for (const [xa, xb] of [[x0 - 0.05, x0 + 1.6], [x1 - 1.6, x1 + 0.05]]) b.box(m.renderDark, xa, y + SLAB / 2, z0 - 0.05, xb, top - SLAB / 2, z1 + 0.05);
  }

  const sill = y + 0.95, head = y + 2.45;
  for (const face of ["n", "s"]) {
    // Windows outside the bays (plan px 410-470 and 730-790), narrow stair windows in the stone strip.
    windowAt(b, m, face, -5.9, -4.1, sill, head);
    windowAt(b, m, face, 4.1, 5.9, sill, head);
    windowAt(b, m, face, -2.6, -1.9, sill, head);
    windowAt(b, m, face, 1.9, 2.6, sill, head);
    if (rnd() > 0.35) acUnit(b, m, face, -5.0 + (rnd() > 0.5 ? 0 : 10), y + 0.35);
    for (const [xa, xb] of BAYS) {
      if (typical) {
        // Balcony slab, frame fins and railing; doors and a window behind.
        const out = face === "n" ? -1 : 1;
        const zw = face === "n" ? z0 : z1;
        const ze = zw + out * 1.5;
        b.box(m.beige, xa, y - SLAB / 2, zw, xb, y + 0.1, ze);
        b.box(m.beige, xa - 0.35, y - SLAB / 2, zw, xa, top - SLAB / 2, ze + out * 0.1);
        b.box(m.beige, xb, y - SLAB / 2, zw, xb + 0.35, top - SLAB / 2, ze + out * 0.1);
        if (index === 5) b.box(m.beige, xa - 0.35, top - SLAB / 2, zw, xb + 0.35, top + 0.25, ze + out * 0.1);
        railing(b, m, xa, xb, ze - out * 0.04, y + 0.1, out);
        windowAt(b, m, face, xa + 0.7, xa + 3.0, y + 0.15, y + 2.4);
        windowAt(b, m, face, xb - 2.4, xb - 0.8, sill, head);
        if (rnd() > 0.5) acUnit(b, m, face, xb - 0.5, y + 0.12);
      } else {
        windowAt(b, m, face, xa + 0.6, xa + 2.4, sill, head);
        windowAt(b, m, face, xb - 2.4, xb - 0.6, sill, head);
      }
    }
  }
  for (const face of ["e", "w"]) {
    for (const u of [-6.2, 0, 6.2]) windowAt(b, m, face, u - 0.8, u + 0.8, sill, head);
    if (rnd() > 0.4) acUnit(b, m, face, 3.1, y + 0.4);
    if (typical) {
      // Corner balconies on the short facades, like the photo's wrap-around bays.
      const x = face === "e" ? x1 : x0;
      const out = face === "e" ? 1 : -1;
      b.box(m.beige, x, y - SLAB / 2, -3.2, x + out * 1.2, y + 0.1, 3.2);
      sideRailing(b, m, x + out * 1.16, -3.2, 3.2, y + 0.1);
    }
  }
  if (!typical) {
    // Entrance on the north facade: door, canopy and steps.
    b.box(m.door, -1.2, PLINTH, z0 - 0.05, 1.2, PLINTH + 2.5, z0);
    b.box(m.glass, -1.0, PLINTH + 0.1, z0 - 0.07, 1.0, PLINTH + 2.3, z0 - 0.04);
    b.box(m.beige, -2.2, PLINTH + 2.8, z0 - 2.2, 2.2, PLINTH + 3.0, z0);
    b.box(m.beige, -2.0, 0, z0 - 1.8, 2.0, 0.15, z0);
    b.box(m.beige, -2.0, 0.15, z0 - 1.2, 2.0, 0.3, z0);
    b.box(m.beige, -2.0, 0.3, z0 - 0.6, 2.0, PLINTH, z0);
  }
  return b.build();
}

function roof(m) {
  const b = new Batch("roof");
  const { x0, x1, z0, z1 } = FOOTPRINT;
  const y = PLINTH + FLOOR_IDS.length * FLOOR_HEIGHT;
  b.box(m.concrete, x0 - 0.1, y - SLAB / 2, z0 - 0.1, x1 + 0.1, y + 0.15, z1 + 0.1, 4);
  // Parapet with a cap.
  const p = 1.05, t = 0.22;
  for (const [ax, az, bx, bz] of [[x0, z0, x1, z0 + t], [x0, z1 - t, x1, z1], [x0, z0, x0 + t, z1], [x1 - t, z0, x1, z1]]) {
    b.box(m.render, ax, y, az, bx, y + p, bz);
    b.box(m.beige, ax - 0.06, y + p, az - 0.06, bx + 0.06, y + p + 0.1, bz + 0.06);
  }
  // Stair and lift room, with a door and a slightly taller lift overrun.
  b.box(m.beige, -3.2, y, -2.6, 3.2, y + 3.0, 2.6);
  b.box(m.beige, -3.4, y + 3.0, -2.8, 3.4, y + 3.2, 2.8);
  b.box(m.beige, 0.3, y + 3.2, -1.6, 2.6, y + 4.2, 1.2);
  b.box(m.door, -1.0, y + 0.15, -2.65, 0.0, y + 2.3, -2.6);
  // Water tanks on a stand and satellite dishes.
  const tankGeo = new THREE.CylinderGeometry(0.75, 0.75, 1.6, 20);
  for (const [x, z] of [[-9, 5.5], [-7, 5.5], [-5, 5.5]]) {
    b.box(m.rail, x - 0.9, y, z - 0.9, x + 0.9, y + 0.5, z + 0.9);
    b.shape(m.tank, tankGeo, { position: [x, y + 1.3, z] });
  }
  const dish = new THREE.SphereGeometry(0.45, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.6);
  const pole = new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6);
  for (const [x, z, r] of [[5, -6, 0.6], [6.5, -6.4, 0.3], [-11, -6, 0.9], [11, 6, -0.4]]) {
    b.shape(m.rail, pole, { position: [x, y + 0.6, z] });
    b.shape(m.ac, dish, { position: [x, y + 1.15, z], rotation: [-1.0, r, 0] });
  }
  for (const x of [8, 9.2, 10.4, 11.6]) b.box(m.ac, x, y + 0.15, 3.6, x + 0.9, y + 0.8, 4.0);
  return b.build();
}

function tree(b, m, x, z, rnd) {
  const h = 2.2 + rnd() * 1.8;
  b.shape(m.trunk, new THREE.CylinderGeometry(0.08, 0.13, h, 7), { position: [x, h / 2, z] });
  const leaf = new THREE.IcosahedronGeometry(1, 0);
  for (let i = 0; i < 4; i++) {
    const s = 0.8 + rnd() * 0.7;
    b.shape(m.leaves, leaf, { position: [x + (rnd() - 0.5) * 1.1, h + (rnd() - 0.2) * 0.9, z + (rnd() - 0.5) * 1.1], scale: [s, s * 0.85, s], rotation: [rnd(), rnd(), rnd()] });
  }
}

/** Gardens, paths, trees and lamps around the building, kept compact so the model frames well. */
function site() {
  const m = {
    paving: material("paving", { map: tiles([205, 178, 160], "#a58f7e", 21, 6, 22), tile: 2, roughness: 0.9 }),
    lawn: material("lawn", { map: grass(22), tile: 3, roughness: 1 }),
    kerb: material("kerb", { color: 0xcfc6b5, roughness: 0.9 }),
    trunk: material("tree-trunk", { color: 0x5b4330, roughness: 1 }),
    leaves: material("tree-leaves", { color: 0x4f7a32, roughness: 0.9 }),
    rail: material("fence", { color: 0xa8916c, roughness: 0.6, metalness: 0.3 }),
    lamp: material("lamp", { color: 0x2b2b2b, roughness: 0.5, metalness: 0.5 }),
    bulb: material("lamp-glass", { color: 0xfff6dc, emissive: 0xfff1c9, emissiveIntensity: 0.4 }),
  };
  const b = new Batch("site");
  const { x0, x1, z0, z1 } = FOOTPRINT;
  const pad = 9;
  b.box(m.paving, x0 - pad, -0.05, z0 - pad, x1 + pad, 0, z1 + pad);
  // Private gardens of the ground floor apartments (from the ground plan) and outer lawns.
  for (const [ax, az, bx, bz] of [[x0 - 3.5, z0 - 3.5, -3.2, z0], [3.2, z0 - 3.5, x1 + 3.5, z0], [x0 - 3.5, z1, x1 + 3.5, z1 + 3.5], [x0 - 3.5, z0, x0, z1], [x1, z0, x1 + 3.5, z1]]) {
    b.box(m.kerb, ax, 0, az, bx, 0.12, bz);
    b.box(m.lawn, ax + 0.12, 0.12, az + 0.12, bx - 0.12, 0.14, bz - 0.12);
  }
  for (const [ax, az, bx, bz] of [[x0 - pad, z0 - pad, x0 - 6, z1 + pad], [x1 + 6, z0 - pad, x1 + pad, z1 + pad], [x0 - 6, z1 + 6, x1 + 6, z1 + pad]]) {
    b.box(m.kerb, ax, 0, az, bx, 0.1, bz);
    b.box(m.lawn, ax + 0.15, 0.1, az + 0.15, bx - 0.15, 0.12, bz - 0.15);
  }
  // Low garden fence.
  for (const [ax, az, bx, bz] of [[x0 - 3.5, z0 - 3.5, -3.2, z0 - 3.45], [3.2, z0 - 3.5, x1 + 3.5, z0 - 3.45], [x0 - 3.5, z1 + 3.45, x1 + 3.5, z1 + 3.5], [x0 - 3.55, z0 - 3.5, x0 - 3.5, z1 + 3.5], [x1 + 3.5, z0 - 3.5, x1 + 3.55, z1 + 3.5]]) {
    b.box(m.rail, ax, 0.9, az, bx, 0.95, bz);
    const len = Math.max(bx - ax, bz - az);
    for (let s = 0; s <= len; s += 1.5) {
      const px = bx - ax > bz - az ? ax + s : ax;
      const pz = bx - ax > bz - az ? az : az + s;
      b.box(m.rail, px - 0.03, 0, pz - 0.03, px + 0.03, 0.95, pz + 0.03);
    }
  }
  const rnd = random(31);
  for (const [x, z] of [[-22, -16], [-22, -6], [-22, 5], [-22, 15], [22, -16], [22, -6], [22, 5], [22, 15], [-14, 17.5], [-5, 17.5], [5, 17.5], [14, 17.5], [-12, -17.5], [12, -17.5], [-17.5, -12], [17.5, -12]]) tree(b, m, x, z, rnd);
  for (const [x, z] of [[-6, -15], [6, -15], [-19, 0], [19, 0]]) {
    b.shape(m.lamp, new THREE.CylinderGeometry(0.05, 0.07, 3.4, 8), { position: [x, 1.7, z] });
    b.shape(m.bulb, new THREE.SphereGeometry(0.2, 12, 8), { position: [x, 3.5, z] });
  }
  return b.build({ castShadow: true });
}

/** The whole model: site, six floor groups and the roof. */
export function buildResidence() {
  const m = buildingMaterials();
  const root = new THREE.Group();
  root.name = "residence";
  root.add(site());
  FLOOR_IDS.forEach((_, i) => root.add(floor(i, m)));
  root.add(roof(m));
  return root;
}
