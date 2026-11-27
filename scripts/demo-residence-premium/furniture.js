// Furniture and room parts for the interior panoramas (browser module).
// Every helper adds boxes and shapes to a Batch; sizes are in metres and
// `x, z` is the centre of the piece on the floor unless noted.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const rounded = (w, h, d, r = 0.04) => new RoundedBoxGeometry(w, h, d, 3, r);

/** A sofa facing +z (rot 0) with seat, back, arms and loose cushions. */
export function sofa(b, m, { x, z, w = 2.6, d = 0.95, rot = 0 }) {
  const parts = [
    [rounded(w, 0.42, d, 0.05), [0, 0.21 + 0.06, 0]],
    [rounded(w, 0.5, 0.22, 0.06), [0, 0.62, -d / 2 + 0.11]],
    [rounded(0.2, 0.62, d, 0.06), [-w / 2 + 0.1, 0.37, 0]],
    [rounded(0.2, 0.62, d, 0.06), [w / 2 - 0.1, 0.37, 0]],
  ];
  const n = Math.max(1, Math.round((w - 0.4) / 0.8));
  const cw = (w - 0.42) / n;
  for (let i = 0; i < n; i++) parts.push([rounded(cw - 0.03, 0.14, d - 0.3, 0.06), [-w / 2 + 0.21 + cw * (i + 0.5), 0.55, 0.08]]);
  for (let i = 0; i < n; i++) parts.push([rounded(cw - 0.08, 0.42, 0.14, 0.07), [-w / 2 + 0.21 + cw * (i + 0.5), 0.82, -d / 2 + 0.3]]);
  for (const [geo, p] of parts) place(b, m.fabric, geo, x, z, rot, p);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) place(b, m.metal, new THREE.CylinderGeometry(0.02, 0.02, 0.06, 6), x, z, rot, [sx * (w / 2 - 0.08), 0.03, sz * (d / 2 - 0.08)]);
}

/** Places a geometry at a local offset `p` of a piece standing at (x, z) and turned by `rot` around y. */
export function place(b, mat, geo, x, z, rot, p, extraRot = [0, 0, 0]) {
  const c = Math.cos(rot), s = Math.sin(rot);
  b.shape(mat, geo, { position: [x + p[0] * c + p[2] * s, p[1], z - p[0] * s + p[2] * c], rotation: [extraRot[0], rot + extraRot[1], extraRot[2]] });
}

export function coffeeTable(b, m, { x, z, w = 1.2, d = 0.65 }) {
  b.shape(m.wood, rounded(w, 0.05, d, 0.02), { position: [x, 0.4, z] });
  b.shape(m.wood, rounded(w - 0.1, 0.03, d - 0.1, 0.01), { position: [x, 0.12, z] });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(m.metal, x + sx * (w / 2 - 0.06) - 0.015, 0, z + sz * (d / 2 - 0.06) - 0.015, x + sx * (w / 2 - 0.06) + 0.015, 0.38, z + sz * (d / 2 - 0.06) + 0.015);
  b.shape(m.ceramic, new THREE.CylinderGeometry(0.09, 0.06, 0.12, 16), { position: [x - 0.25, 0.48, z] });
  b.shape(m.book, rounded(0.3, 0.05, 0.22, 0.005), { position: [x + 0.2, 0.45, z + 0.05] });
}

export function rug(b, mat, { x, z, w, d }) {
  b.shape(mat, rounded(w, 0.012, d, 0.005), { position: [x, 0.006, z] });
}

export function diningSet(b, m, { x, z, w = 1.8, d = 0.95, chairs = 6 }) {
  b.shape(m.wood, rounded(w, 0.05, d, 0.015), { position: [x, 0.75, z] });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(m.wood, x + sx * (w / 2 - 0.1) - 0.03, 0, z + sz * (d / 2 - 0.1) - 0.03, x + sx * (w / 2 - 0.1) + 0.03, 0.73, z + sz * (d / 2 - 0.1) + 0.03);
  const per = chairs / 2;
  for (let i = 0; i < per; i++) {
    const cx = x - w / 2 + (w / per) * (i + 0.5);
    chair(b, m, { x: cx, z: z - d / 2 - 0.25, rot: 0 });
    chair(b, m, { x: cx, z: z + d / 2 + 0.25, rot: Math.PI });
  }
}

export function chair(b, m, { x, z, rot }) {
  place(b, m.fabric2, rounded(0.46, 0.08, 0.46, 0.03), x, z, rot, [0, 0.46, 0]);
  place(b, m.fabric2, rounded(0.46, 0.45, 0.06, 0.03), x, z, rot, [0, 0.72, -0.22]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) place(b, m.wood, new THREE.CylinderGeometry(0.018, 0.015, 0.44, 6), x, z, rot, [sx * 0.19, 0.22, sz * 0.19]);
}

export function plant(b, m, { x, z, h = 1.4, pot = 0.22 }) {
  b.shape(m.ceramic, new THREE.CylinderGeometry(pot, pot * 0.8, pot * 1.6, 18), { position: [x, pot * 0.8, z] });
  const leaf = new THREE.SphereGeometry(1, 8, 6);
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4, r = 0.12 + (i % 3) * 0.06, y = pot * 1.6 + 0.25 + (i / 9) * (h - 0.5);
    b.shape(m.leaf, leaf, { position: [x + Math.cos(a) * r, y, z + Math.sin(a) * r], scale: [0.24, 0.07, 0.11], rotation: [0.3, a, 0.5] });
  }
  b.shape(m.trunk, new THREE.CylinderGeometry(0.015, 0.02, h - 0.3, 5), { position: [x, pot * 1.6 + (h - 0.3) / 2, z] });
}

export function floorLamp(b, m, { x, z }) {
  b.shape(m.metal, new THREE.CylinderGeometry(0.16, 0.16, 0.02, 20), { position: [x, 0.01, z] });
  b.shape(m.metal, new THREE.CylinderGeometry(0.012, 0.012, 1.5, 6), { position: [x, 0.76, z] });
  b.shape(m.shade, new THREE.CylinderGeometry(0.16, 0.22, 0.3, 24, 1, true), { position: [x, 1.6, z] });
}

export function pendant(b, m, { x, z, ceiling, drop = 0.7 }) {
  b.shape(m.metal, new THREE.CylinderGeometry(0.004, 0.004, drop, 4), { position: [x, ceiling - drop / 2, z] });
  b.shape(m.pendant, new THREE.SphereGeometry(0.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), { position: [x, ceiling - drop - 0.0, z], rotation: [Math.PI, 0, 0] });
  b.shape(m.bulb, new THREE.SphereGeometry(0.05, 12, 8), { position: [x, ceiling - drop - 0.06, z] });
}

/** A picture on a wall facing `normal` ("+x", "-x", "+z", "-z"), centre (x, y, z). */
export function frame(b, m, mat, { x, y, z, w, h, normal }) {
  const t = 0.03;
  const box = (mm, dw, dh, dd, off) => {
    if (normal === "+z" || normal === "-z") b.box(mm, x - dw / 2, y - dh / 2, z + (normal === "+z" ? off : -off - dd), x + dw / 2, y + dh / 2, z + (normal === "+z" ? off + dd : -off));
    else b.box(mm, x + (normal === "+x" ? off : -off - dd), y - dh / 2, z - dw / 2, x + (normal === "+x" ? off + dd : -off), y + dh / 2, z + dw / 2);
  };
  box(m.frameWood, w + 0.06, h + 0.06, t, 0);
  box(mat, w, h, 0.005, t);
}

export function bed(b, m, { x, z, w = 1.8, l = 2.1, rot = 0 }) {
  place(b, m.wood, rounded(w + 0.1, 0.3, l + 0.05, 0.02), x, z, rot, [0, 0.15, 0]);
  place(b, m.linen, rounded(w, 0.25, l - 0.05, 0.08), x, z, rot, [0, 0.42, 0.02]);
  place(b, m.throw, rounded(w + 0.04, 0.05, 0.7, 0.03), x, z, rot, [0, 0.55, l / 2 - 0.45]);
  place(b, m.fabric, rounded(w + 0.2, 1.1, 0.12, 0.05), x, z, rot, [0, 0.75, -l / 2 - 0.04]);
  for (const sx of [-1, 1]) {
    place(b, m.linen, rounded(0.65, 0.16, 0.42, 0.07), x, z, rot, [sx * w * 0.24, 0.62, -l / 2 + 0.3], [-0.35, 0, 0]);
    place(b, m.throw, rounded(0.45, 0.13, 0.3, 0.06), x, z, rot, [sx * w * 0.16, 0.62, -l / 2 + 0.52], [-0.25, 0, 0]);
  }
}

export function sideTable(b, m, { x, z }) {
  b.shape(m.wood, rounded(0.5, 0.45, 0.42, 0.02), { position: [x, 0.225, z] });
  b.shape(m.ceramic, new THREE.CylinderGeometry(0.06, 0.09, 0.28, 16), { position: [x, 0.59, z] });
  b.shape(m.shade, new THREE.CylinderGeometry(0.13, 0.17, 0.22, 20, 1, true), { position: [x, 0.83, z] });
}

export function curtain(b, mat, { x0, x1, z, top, bottom = 0.02, axis = "x" }) {
  // Pleated curtain: a row of thin vertical rounded boxes.
  const n = Math.max(3, Math.round(Math.abs(x1 - x0) / 0.09));
  const step = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    const c = x0 + step * (i + 0.5);
    const off = (i % 2) * 0.04;
    const geo = rounded(Math.abs(step) * 1.1, top - bottom, 0.05, 0.02);
    if (axis === "x") b.shape(mat, geo, { position: [c, (top + bottom) / 2, z + off] });
    else b.shape(mat, geo, { position: [z + off, (top + bottom) / 2, c], rotation: [0, Math.PI / 2, 0] });
  }
}
