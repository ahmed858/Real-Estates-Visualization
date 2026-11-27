import { describe, expect, it } from "vitest";
import { GlbFormatError, glbNodeNames } from "./glb-node-names";

/** A .glb with only a JSON chunk. */
function glb(json: string, { magic = 0x46546c67, version = 2 } = {}): Uint8Array {
  const body = new TextEncoder().encode(json.padEnd(Math.ceil(json.length / 4) * 4, " "));
  const out = new Uint8Array(20 + body.length);
  const v = new DataView(out.buffer);
  v.setUint32(0, magic, true);
  v.setUint32(4, version, true);
  v.setUint32(8, out.length, true);
  v.setUint32(12, body.length, true);
  v.setUint32(16, 0x4e4f534a, true);
  out.set(body, 20);
  return out;
}

describe("glbNodeNames", () => {
  it("lists node names in order, trimmed, without duplicates or unnamed nodes", () => {
    const json = JSON.stringify({ asset: { version: "2.0" }, nodes: [{ name: "Tower" }, { name: " Unit_A1 " }, { mesh: 0 }, { name: "" }, { name: "Unit_A1" }, { name: 3 }] });
    expect(glbNodeNames(glb(json))).toEqual(["Tower", "Unit_A1"]);
  });

  it("returns no names for a file without nodes", () => {
    expect(glbNodeNames(glb(JSON.stringify({ asset: { version: "2.0" } })))).toEqual([]);
  });

  it("refuses files that are not glTF 2 binaries", () => {
    expect(() => glbNodeNames(new Uint8Array(4))).toThrow(GlbFormatError);
    expect(() => glbNodeNames(glb("{}", { magic: 0x12345678 }))).toThrow(/not a glTF binary/);
    expect(() => glbNodeNames(glb("{}", { version: 1 }))).toThrow(/version 1/);
    expect(() => glbNodeNames(glb("{not json"))).toThrow(/not valid JSON/);
  });
});
