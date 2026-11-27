// Names of the nodes in a glTF binary (.glb) file, read straight from its JSON
// chunk: no 3D library, no geometry. The editor offers these names as the
// meshes a hotspot can be (a hotspot's `mesh` matches a node or its ancestor).
const GLB_MAGIC = 0x46546c67; // "glTF"
const JSON_CHUNK = 0x4e4f534a; // "JSON"

export class GlbFormatError extends Error {}

/** Node names in file order, without duplicates or empty names. Throws GlbFormatError for a file that is not a glTF 2 binary. */
export function glbNodeNames(bytes: Uint8Array): string[] {
  if (bytes.byteLength < 20) throw new GlbFormatError("file is too short to be a .glb");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== GLB_MAGIC) throw new GlbFormatError("not a glTF binary (.glb) file");
  if (view.getUint32(4, true) !== 2) throw new GlbFormatError(`unsupported glTF version ${view.getUint32(4, true)}`);
  const length = view.getUint32(12, true);
  if (view.getUint32(16, true) !== JSON_CHUNK || 20 + length > bytes.byteLength) throw new GlbFormatError("the first chunk is not the JSON chunk");
  let json: unknown;
  try {
    json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + length)));
  } catch {
    throw new GlbFormatError("the JSON chunk is not valid JSON");
  }
  const nodes = (json as { nodes?: unknown }).nodes;
  if (!Array.isArray(nodes)) return [];
  const names = nodes.map((n) => (n && typeof n === "object" && typeof (n as { name?: unknown }).name === "string" ? (n as { name: string }).name.trim() : ""));
  return [...new Set(names.filter((n) => n !== ""))];
}
