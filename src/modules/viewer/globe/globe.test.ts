import { describe, expect, it } from "vitest";
import { countryPath, globeMode, isWeakDevice, ringOffsets, toMap, tourTimings, unwrapRing, zoomOrigin } from "../index";

describe("globeMode", () => {
  it("gives the WebGL globe to capable devices", () => {
    expect(globeMode(true, { hardwareConcurrency: 8, deviceMemory: 8 })).toBe("webgl");
    expect(globeMode(true, undefined)).toBe("webgl");
    expect(globeMode(true, {})).toBe("webgl");
  });

  it("gives the flat map without WebGL, to weak devices and with data saver on", () => {
    expect(globeMode(false, { hardwareConcurrency: 8 })).toBe("static");
    expect(globeMode(true, { hardwareConcurrency: 2 })).toBe("static");
    expect(globeMode(true, { deviceMemory: 1 })).toBe("static");
    expect(globeMode(true, { connection: { saveData: true } })).toBe("static");
    expect(isWeakDevice({ hardwareConcurrency: 4, deviceMemory: 4, connection: { saveData: false } })).toBe(false);
  });
});

describe("world map projection", () => {
  it("maps the corners and the centre of the world", () => {
    expect(toMap({ lat: 90, lng: -180 }, 360, 180)).toEqual([0, 0]);
    expect(toMap({ lat: 0, lng: 0 }, 360, 180)).toEqual([180, 90]);
    expect(toMap({ lat: -90, lng: 180 }, 720, 360)).toEqual([720, 360]);
  });

  it("unwraps a ring across the date line and draws it on both sides", () => {
    const { points, crosses } = unwrapRing([
      [170, 60],
      [-170, 60],
      [-170, 50],
      [170, 50],
    ]);
    expect(crosses).toBe(true);
    expect(points.map(([x]) => x)).toEqual([170, 190, 190, 170]);
    expect(ringOffsets(points)).toEqual([0, -360]);
  });

  it("leaves an ordinary ring alone", () => {
    const { points, crosses } = unwrapRing([
      [30, 30],
      [35, 30],
      [35, 25],
    ]);
    expect(crosses).toBe(false);
    expect(ringOffsets(points)).toEqual([0]);
  });

  it("writes one closed SVG subpath per ring copy", () => {
    const d = countryPath({ id: "1", name: "Box", polygons: [[[[0, 0], [10, 0], [10, 10], [0, 0]]]] }, 360, 180);
    expect(d).toBe("M180.00,90.00L190.00,90.00L190.00,80.00L180.00,90.00Z");
  });
});

describe("guided tour timing", () => {
  it("zooms only without reduced motion, and gives the visitor time to read the unit", () => {
    expect(tourTimings(true).zoom).toBe(0);
    expect(tourTimings(false).zoom).toBeGreaterThan(0);
    expect(tourTimings(false).select).toBeGreaterThan(1000);
  });

  it("aims the zoom at the hotspot's centre", () => {
    expect(zoomOrigin([[100, 50], [300, 50], [300, 150], [100, 150]], 400, 200)).toBe("50.00% 50.00%");
  });
});

describe("seeded city", () => {
  it("draws the same city for the same project and a different one elsewhere", async () => {
    const { seededRandom, seedOf } = await import("./city-texture");
    const a = seededRandom(seedOf(30.01, 31.49));
    const b = seededRandom(seedOf(30.01, 31.49));
    const c = seededRandom(seedOf(24.7, 46.7));
    const first = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(first);
    expect([c(), c(), c()]).not.toEqual(first);
    expect(first.every((x) => x >= 0 && x < 1)).toBe(true);
  });
});
