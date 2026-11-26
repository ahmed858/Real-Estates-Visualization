import { describe, expect, it } from "vitest";
import { buildVillaGeometry, floorPlanFrame, renderFloorPlanSvg } from "../../index";

const villa = buildVillaGeometry();
const floorIds = villa.floors.map((f) => f.id);

/** Checks that every opened tag is closed in order (enough to catch broken markup). */
function isBalanced(svg: string): boolean {
  const stack: string[] = [];
  for (const m of svg.matchAll(/<(\/?)([a-z]+)\b[^>]*?(\/?)>/g)) {
    const [, closing, tag, selfClosing] = m;
    if (selfClosing) continue;
    if (!closing) stack.push(tag);
    else if (stack.pop() !== tag) return false;
  }
  return stack.length === 0;
}

describe("renderFloorPlanSvg", () => {
  it.each(floorIds)("%s matches the committed drawing", async (id) => {
    await expect(renderFloorPlanSvg(villa, id)).toMatchFileSnapshot(`./__snapshots__/floor-${id}.svg`);
  });

  it.each(floorIds)("%s is a well-formed SVG with every room labelled", (id) => {
    const svg = renderFloorPlanSvg(villa, id);
    const frame = floorPlanFrame(villa);
    expect(svg.startsWith(`<svg xmlns="http://www.w3.org/2000/svg" width="${frame.width}" height="${frame.height}"`)).toBe(true);
    expect(isBalanced(svg)).toBe(true);
    const floor = villa.floors.find((f) => f.id === id)!;
    for (const room of floor.units.flatMap((u) => u.rooms)) {
      expect(svg).toContain(`>${room.name.en}<`);
      expect(svg).toContain(`>${room.name.ar}<`);
    }
    expect(svg).toContain(">N<"); // north arrow
    expect(svg).toContain(">5 m<"); // scale bar
    expect(svg.match(/<line [^>]*stroke-linecap="square"/g)).toHaveLength(floor.walls.length);
  });

  it("draws the courtyard fences only on the ground floor", () => {
    expect(renderFloorPlanSvg(villa, "ground")).toContain('stroke-dasharray="6 4"');
    expect(renderFloorPlanSvg(villa, "first")).not.toContain('stroke-dasharray="6 4"');
  });

  it("maps the plot corners into the frame with its margin", () => {
    const frame = floorPlanFrame(villa);
    expect(frame.toPx([0, 0])).toEqual([60, 60]);
    expect(frame.toPx([villa.plot.width, villa.plot.height])).toEqual([frame.width - 60, frame.height - 160]);
  });

  it("rejects an unknown floor", () => {
    expect(() => renderFloorPlanSvg(villa, "attic" as never)).toThrow('unknown floor "attic"');
  });
});
