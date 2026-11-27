// Small building kit for the generated demo scenes (browser module, three.js):
// boxes with world-sized texture tiling, collected per material and merged
// into one mesh per material, so a scene stays a few hundred draw calls and
// an exported model stays small.
import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

/** A box from its lowest to its highest corner, with UVs in metres divided by `tile`. */
export function boxGeometry(x0, y0, z0, x1, y1, z1, tile = 1) {
  const w = x1 - x0, h = y1 - y0, d = z1 - z0;
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  // Face order: +x, -x, +y, -y, +z, -z; four vertices each.
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) {
    const i = f * 4 + v;
    uv.setXY(i, (uv.getX(i) * dims[f][0]) / tile, (uv.getY(i) * dims[f][1]) / tile);
  }
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}

/** Collects geometries per material; `build()` merges them into named meshes under one group. */
export class Batch {
  constructor(name) {
    this.name = name;
    this.parts = new Map();
  }
  add(material, geometry) {
    let g = geometry;
    for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    // Indexed geometry everywhere: shared vertices keep the exported model small.
    if (!g.index) g = mergeVertices(g);
    if (!this.parts.has(material)) this.parts.set(material, []);
    this.parts.get(material).push(g);
    return this;
  }
  box(material, x0, y0, z0, x1, y1, z1, tile) {
    return this.add(material, boxGeometry(Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1), Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1), tile ?? material.userData.tile ?? 1));
  }
  /** Any geometry, moved/rotated/scaled by a matrix. */
  shape(material, geometry, { position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1] } = {}) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(...scale));
    return this.add(material, geometry.clone().applyMatrix4(m));
  }
  build({ castShadow = true, receiveShadow = true } = {}) {
    const group = new THREE.Group();
    group.name = this.name;
    let n = 0;
    for (const [material, geometries] of this.parts) {
      const merged = mergeGeometries(geometries, false);
      // Untextured parts need no UVs; dropping them keeps the exported model smaller.
      if (!material.map) merged.deleteAttribute("uv");
      const mesh = new THREE.Mesh(merged, material);
      mesh.name = `${this.name}-${material.name || "part"}-${n++}`;
      mesh.castShadow = castShadow && !material.transparent;
      mesh.receiveShadow = receiveShadow;
      group.add(mesh);
    }
    return group;
  }
}

/** A standard material with a name (kept in the exported model) and an optional tiling size in metres. */
export function material(name, { color, roughness = 0.8, metalness = 0, map, tile, opacity, emissive, emissiveIntensity, side } = {}) {
  const m = new THREE.MeshStandardMaterial({ name, color: new THREE.Color(color ?? 0xffffff), roughness, metalness, map: map ?? null });
  if (opacity !== undefined) {
    m.transparent = true;
    m.opacity = opacity;
  }
  if (emissive !== undefined) {
    m.emissive = new THREE.Color(emissive);
    m.emissiveIntensity = emissiveIntensity ?? 1;
  }
  if (side !== undefined) m.side = side;
  m.userData.tile = tile ?? 1;
  return m;
}

/** Deterministic pseudo-random numbers, so every run draws the same scene. */
export function random(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
