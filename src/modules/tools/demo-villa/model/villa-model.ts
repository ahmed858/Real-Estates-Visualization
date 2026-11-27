// The demo villa as a 3D model: the same block the turntable draws, as boxes,
// with one named node per ground and first floor apartment (its rooms inside
// the footprint, one storey high), the stair core, and the roof (parapet and
// the structures on it). Plan metres (x east, y south, z up) become glTF
// coordinates centred on the footprint: X east, Y up, Z south.
import type { Rect, VillaGeometry } from "../geometry/types";
import type { GlbBox, GlbNode } from "../../glb/write-glb";
import { buildTurntableModel } from "../turntable/turntable-geometry";
import { STOREY_HEIGHT } from "../facade/facade-geometry";

export const ROOF_NODE = "roof";
export const STAIR_NODE = "stair";

const round = (n: number) => Math.round(n * 1000) / 1000;

const clip = (r: Rect, f: Rect): Rect | undefined => {
  const x = Math.max(r.x, f.x);
  const y = Math.max(r.y, f.y);
  const width = Math.min(r.x + r.width, f.x + f.width) - x;
  const height = Math.min(r.y + r.height, f.y + f.height) - y;
  return width > 0 && height > 0 ? { x, y, width, height } : undefined;
};

/** Nodes of the villa model, apartments first (named by unit code). */
export function buildVillaModelNodes(villa: VillaGeometry): GlbNode[] {
  const model = buildTurntableModel(villa);
  const f = model.footprint;
  const [cx, cy] = [f.x + f.width / 2, f.y + f.height / 2];
  const box = (r: Rect, base: number, top: number): GlbBox => ({
    min: [round(r.x - cx), round(base), round(r.y - cy)],
    max: [round(r.x + r.width - cx), round(top), round(r.y + r.height - cy)],
  });

  const nodes: GlbNode[] = [];
  let base = 0;
  let stair: Rect | undefined;
  for (const floor of villa.floors) {
    if (floor.id === "roof") break;
    const top = base + STOREY_HEIGHT[floor.id];
    for (const unit of floor.units) {
      const parts = unit.parts.map((p) => clip(p, f)).filter((p): p is Rect => p !== undefined);
      nodes.push({ name: unit.code, boxes: parts.map((p) => box(p, base, top)) });
    }
    stair ??= floor.common.find((c) => c.id === "stair")?.rect;
    base = top;
  }
  if (stair) nodes.push({ name: STAIR_NODE, boxes: [box(stair, 0, base)] });
  const parapet = model.bands.find((b) => b.id === "parapet")!;
  nodes.push({ name: ROOF_NODE, boxes: [box(f, parapet.base, parapet.top), ...model.roofBoxes.map((b) => box(b.rect, b.base, b.top))] });
  return nodes;
}
