import { describe, expect, it } from "vitest";
import { buildVillaGeometry } from "../geometry/villa-geometry";
import { frameAngle, TURNTABLE_FRAMES, TURNTABLE_HEIGHT, TURNTABLE_WIDTH, turntableCamera } from "./turntable-camera";
import { buildTurntableModel } from "./turntable-geometry";
import { renderTurntableFrameSvg, stripPolygon, turntableUnitFrames } from "./turntable-svg";

const villa = buildVillaGeometry();
const units = turntableUnitFrames(villa);
const frames = (code: string) => units.find((u) => u.code === code)!.frames;

describe("turntableCamera", () => {
  it("spreads the frames over a full turn", () => {
    expect(frameAngle(1)).toBe(0);
    expect(frameAngle(7)).toBe(90);
    expect(frameAngle(TURNTABLE_FRAMES + 1)).toBe(360);
  });

  it("frame 1 looks at the south face, frame 13 at the north face", () => {
    const south = turntableCamera(frameAngle(1), [10, 9]);
    const north = turntableCamera(frameAngle(13), [10, 9]);
    expect(south.faces([0, 1])).toBe(true);
    expect(south.faces([0, -1])).toBe(false);
    expect(north.faces([0, -1])).toBe(true);
    expect(north.faces([0, 1])).toBe(false);
    // Edge-on faces are hidden.
    expect(turntableCamera(90, [10, 9]).faces([0, 1])).toBe(false);
  });

  it("draws nearer points lower and higher points higher", () => {
    const cam = turntableCamera(0, [10, 9]);
    expect(cam.toPx([10, 16, 0])[1]).toBeGreaterThan(cam.toPx([10, 2, 0])[1]);
    expect(cam.toPx([10, 9, 5])[1]).toBeLessThan(cam.toPx([10, 9, 0])[1]);
  });
});

describe("buildTurntableModel", () => {
  it("gives each ground and first floor apartment a connected strip of outer wall", () => {
    const model = buildTurntableModel(villa);
    expect(model.strips.map((s) => [s.code, s.base, s.top])).toEqual([
      ["G-01", 0, 3.5],
      ["G-02", 0, 3.5],
      ["F-01", 3.5, 6.7],
      ["F-02", 3.5, 6.7],
    ]);
    const west = model.strips[0];
    expect(west.segments.map((s) => [s.wall.side, s.from, s.to])).toEqual([
      ["north", [2, 2], [8.5, 2]],
      ["south", [10, 16], [2, 16]],
      ["west", [2, 16], [2, 2]],
    ]);
  });
});

describe("turntableUnitFrames", () => {
  it("shows all four apartments on frame 1 (the poster) and keeps every point inside the frame", () => {
    expect(units.map((u) => u.code)).toEqual(["G-01", "G-02", "F-01", "F-02"]);
    for (const u of units) {
      expect(u.frames["1"]).toBeDefined();
      for (const [frame, polygon] of Object.entries(u.frames)) {
        expect(Number(frame)).toBeGreaterThanOrEqual(1);
        expect(Number(frame)).toBeLessThanOrEqual(TURNTABLE_FRAMES);
        expect(polygon.length).toBeGreaterThanOrEqual(4);
        for (const [x, y] of polygon) {
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(TURNTABLE_WIDTH);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThanOrEqual(TURNTABLE_HEIGHT);
        }
      }
    }
  });

  it("hides a west apartment when the camera looks straight at the east face", () => {
    // Frame 19 (270°) faces east... the side opposite to frame 7.
    const eastFacing = [7, 19].find((f) => turntableCamera(frameAngle(f), [10, 9]).faces([1, 0]))!;
    expect(frames("G-01")[String(eastFacing)]).toBeUndefined();
    expect(frames("G-02")[String(eastFacing)]).toBeDefined();
  });

  it("joins two visible walls at the corner into one polygon", () => {
    // Frame 3 (30°) sees the south and one side face; the corner apartment shows on both.
    const cam = turntableCamera(frameAngle(3), [10, 9]);
    const model = buildTurntableModel(villa);
    const sides = ["G-01", "G-02"].map((code) => {
      const strip = model.strips.find((s) => s.code === code)!;
      return strip.segments.filter((s) => cam.faces(s.wall.normal)).length;
    });
    expect(Math.max(...sides)).toBe(2);
    const corner = model.strips.find((s) => s.code === (sides[0] === 2 ? "G-01" : "G-02"))!;
    expect(stripPolygon(cam, corner)).toHaveLength(6);
  });

  it("refuses a strip whose visible walls are not connected", () => {
    const model = buildTurntableModel(villa);
    const strip = { ...model.strips[0], segments: [model.strips[0].segments[0], model.strips[0].segments[1]] };
    // North and south are never visible together, so make both face the viewer with a fake camera.
    const cam = { ...turntableCamera(0, [10, 9]), faces: () => true };
    expect(() => stripPolygon(cam, strip)).toThrow(/not connected/);
  });
});

describe("renderTurntableFrameSvg", () => {
  it("renders a frame of the declared size, deterministically", () => {
    const svg = renderTurntableFrameSvg(villa, 5);
    expect(svg).toContain(`width="${TURNTABLE_WIDTH}" height="${TURNTABLE_HEIGHT}"`);
    expect(svg).toContain("frame 5 of 24");
    expect(renderTurntableFrameSvg(villa, 5)).toBe(svg);
    expect(renderTurntableFrameSvg(villa, 6)).not.toBe(svg);
  });
});
