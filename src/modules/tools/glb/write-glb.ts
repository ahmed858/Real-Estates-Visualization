// A minimal glTF 2.0 binary (.glb) writer for generated demo models: named
// nodes, each one mesh made of axis-aligned boxes. Only positions, normals
// and indices are written (no materials or textures), so no 3D library is
// needed. Coordinates are glTF's: metres, Y up.

export type Vec3 = readonly [x: number, y: number, z: number];

/** An axis-aligned box from its lowest to its highest corner. */
export interface GlbBox {
  min: Vec3;
  max: Vec3;
}

export interface GlbNode {
  /** Node name, e.g. a unit code; hotspots link to it by this name. */
  name: string;
  boxes: readonly GlbBox[];
}

const GLB_MAGIC = 0x46546c67; // "glTF"
const JSON_CHUNK = 0x4e4f534a; // "JSON"
const BIN_CHUNK = 0x004e4942; // "BIN\0"
const FLOAT = 5126;
const UNSIGNED_SHORT = 5123;
const ARRAY_BUFFER = 34962;
const ELEMENT_ARRAY_BUFFER = 34963;

/** The six faces of a box: outward normal and its four corners (counter-clockwise seen from outside). */
function boxFaces({ min: [x0, y0, z0], max: [x1, y1, z1] }: GlbBox): { normal: Vec3; corners: Vec3[] }[] {
  return [
    { normal: [1, 0, 0], corners: [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]] },
    { normal: [-1, 0, 0], corners: [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]] },
    { normal: [0, 1, 0], corners: [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]] },
    { normal: [0, -1, 0], corners: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]] },
    { normal: [0, 0, 1], corners: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]] },
    { normal: [0, 0, -1], corners: [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]] },
  ];
}

interface MeshData {
  positions: number[];
  normals: number[];
  indices: number[];
}

function meshData(boxes: readonly GlbBox[]): MeshData {
  const data: MeshData = { positions: [], normals: [], indices: [] };
  for (const box of boxes) {
    for (const { normal, corners } of boxFaces(box)) {
      const first = data.positions.length / 3;
      for (const c of corners) {
        data.positions.push(...c);
        data.normals.push(...normal);
      }
      data.indices.push(first, first + 1, first + 2, first, first + 2, first + 3);
    }
  }
  return data;
}

const pad4 = (n: number) => (n + 3) & ~3;

/** Writes the nodes as one scene of a .glb file. Deterministic: the same nodes give the same bytes. */
export function writeGlb(nodes: readonly GlbNode[]): Buffer {
  const chunks: Buffer[] = [];
  let offset = 0;
  const bufferViews: object[] = [];
  const accessors: object[] = [];
  const meshes: object[] = [];

  const addView = (bytes: Buffer, target: number) => {
    bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length, target });
    const padded = Buffer.alloc(pad4(bytes.length));
    bytes.copy(padded);
    chunks.push(padded);
    offset += padded.length;
    return bufferViews.length - 1;
  };

  nodes.forEach((node) => {
    const { positions, normals, indices } = meshData(node.boxes);
    if (positions.length / 3 > 0xffff) throw new Error(`node "${node.name}" has too many vertices for 16-bit indices`);
    const floats = (values: number[]) => Buffer.from(new Float32Array(values).buffer);
    const min = [0, 1, 2].map((a) => Math.min(...positions.filter((_, i) => i % 3 === a)));
    const max = [0, 1, 2].map((a) => Math.max(...positions.filter((_, i) => i % 3 === a)));
    const count = positions.length / 3;
    accessors.push({ bufferView: addView(floats(positions), ARRAY_BUFFER), componentType: FLOAT, count, type: "VEC3", min, max });
    accessors.push({ bufferView: addView(floats(normals), ARRAY_BUFFER), componentType: FLOAT, count, type: "VEC3" });
    accessors.push({ bufferView: addView(Buffer.from(new Uint16Array(indices).buffer), ELEMENT_ARRAY_BUFFER), componentType: UNSIGNED_SHORT, count: indices.length, type: "SCALAR" });
    const a = accessors.length - 3;
    meshes.push({ name: node.name, primitives: [{ attributes: { POSITION: a, NORMAL: a + 1 }, indices: a + 2 }] });
  });

  const bin = Buffer.concat(chunks);
  const json = {
    asset: { version: "2.0", generator: "Unit Explorer demo generator" },
    scene: 0,
    scenes: [{ nodes: nodes.map((_, i) => i) }],
    nodes: nodes.map((n, i) => ({ name: n.name, mesh: i })),
    meshes,
    accessors,
    bufferViews,
    buffers: [{ byteLength: bin.length }],
  };
  const jsonBytes = Buffer.from(JSON.stringify(json), "utf8");
  const jsonChunk = Buffer.alloc(pad4(jsonBytes.length), 0x20);
  jsonBytes.copy(jsonChunk);

  const header = Buffer.alloc(12);
  const total = 12 + 8 + jsonChunk.length + 8 + bin.length;
  header.writeUInt32LE(GLB_MAGIC, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(total, 8);
  const chunkHeader = (length: number, type: number) => {
    const b = Buffer.alloc(8);
    b.writeUInt32LE(length, 0);
    b.writeUInt32LE(type, 4);
    return b;
  };
  return Buffer.concat([header, chunkHeader(jsonChunk.length, JSON_CHUNK), jsonChunk, chunkHeader(bin.length, BIN_CHUNK), bin]);
}
