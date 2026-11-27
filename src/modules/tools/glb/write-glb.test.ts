import { describe, expect, it } from "vitest";
import { glbNodeNames } from "@/modules/domain";
import { writeGlb } from "./write-glb";

const unitBox = { min: [0, 0, 0], max: [1, 2, 3] } as const;

function chunks(glb: Buffer) {
  const jsonLength = glb.readUInt32LE(12);
  const json = JSON.parse(glb.toString("utf8", 20, 20 + jsonLength));
  const binStart = 20 + jsonLength;
  return { json, binLength: glb.readUInt32LE(binStart), binType: glb.readUInt32LE(binStart + 4), bin: glb.subarray(binStart + 8) };
}

describe("writeGlb", () => {
  it("writes a glTF 2 binary with a JSON and a BIN chunk, 4-byte aligned", () => {
    const glb = writeGlb([{ name: "A", boxes: [unitBox] }]);
    expect(glb.readUInt32LE(0)).toBe(0x46546c67);
    expect(glb.readUInt32LE(4)).toBe(2);
    expect(glb.readUInt32LE(8)).toBe(glb.length);
    expect(glb.readUInt32LE(12) % 4).toBe(0);
    const { json, binLength, binType, bin } = chunks(glb);
    expect(binType).toBe(0x004e4942);
    expect(binLength).toBe(bin.length);
    expect(json.buffers).toEqual([{ byteLength: bin.length }]);
    expect(json.asset.version).toBe("2.0");
  });

  it("gives each node one mesh of 24 vertices and 36 indices per box, with bounds", () => {
    const { json, bin } = chunks(writeGlb([{ name: "A", boxes: [unitBox] }, { name: "B", boxes: [unitBox, { min: [2, 0, 0], max: [3, 1, 1] }] }]));
    expect(json.nodes).toEqual([{ name: "A", mesh: 0 }, { name: "B", mesh: 1 }]);
    expect(json.scenes).toEqual([{ nodes: [0, 1] }]);
    const [pos, , idx] = json.accessors;
    expect(pos).toMatchObject({ count: 24, type: "VEC3", min: [0, 0, 0], max: [1, 2, 3] });
    expect(idx).toMatchObject({ count: 36, type: "SCALAR" });
    expect(json.accessors[3]).toMatchObject({ count: 48, min: [0, 0, 0], max: [3, 2, 3] });
    for (const view of json.bufferViews) expect(view.byteOffset + view.byteLength).toBeLessThanOrEqual(bin.length);
    // Normals are unit vectors pointing out of the box.
    const normals = new Float32Array(bin.buffer.slice(bin.byteOffset + json.bufferViews[1].byteOffset, bin.byteOffset + json.bufferViews[1].byteOffset + json.bufferViews[1].byteLength));
    for (let i = 0; i < normals.length; i += 3) expect(Math.hypot(normals[i], normals[i + 1], normals[i + 2])).toBe(1);
  });

  it("winds every triangle so its normal points outward", () => {
    const { json, bin } = chunks(writeGlb([{ name: "A", boxes: [unitBox] }]));
    const bytes = (view: number) => {
      const v = json.bufferViews[view];
      return bin.buffer.slice(bin.byteOffset + v.byteOffset, bin.byteOffset + v.byteOffset + v.byteLength);
    };
    const p = new Float32Array(bytes(0));
    const n = new Float32Array(bytes(1));
    const idx = new Uint16Array(bytes(2));
    for (let t = 0; t < idx.length; t += 3) {
      const [a, b, c] = [idx[t], idx[t + 1], idx[t + 2]].map((i) => [p[i * 3], p[i * 3 + 1], p[i * 3 + 2]]);
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const cross = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
      const i = idx[t] * 3;
      expect(cross[0] * n[i] + cross[1] * n[i + 1] + cross[2] * n[i + 2]).toBeGreaterThan(0);
    }
  });

  it("is read back by glbNodeNames and is deterministic", () => {
    const nodes = [{ name: "G-01", boxes: [unitBox] }, { name: "roof", boxes: [unitBox] }];
    expect(glbNodeNames(writeGlb(nodes))).toEqual(["G-01", "roof"]);
    expect(writeGlb(nodes)).toEqual(writeGlb(nodes));
  });
});
