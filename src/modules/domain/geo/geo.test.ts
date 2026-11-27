import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  childStage,
  countryAt,
  decodeCountries,
  facesCamera,
  flightDuration,
  flightPose,
  latLngToVector,
  parentStage,
  parseGlobeStage,
  polygonContains,
  slerp,
  STAGE_ALTITUDE,
  stageAtAltitude,
  stagePose,
  vectorToLatLng,
  type Topology,
  type Vec3,
} from "../index";

const close = (a: Vec3, b: Vec3) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 6));

describe("latLngToVector", () => {
  it("puts the poles on the y axis and longitude 0 on +x, like three.js sphere UVs", () => {
    close(latLngToVector({ lat: 90, lng: 0 }), [0, 1, 0]);
    close(latLngToVector({ lat: 0, lng: 0 }), [1, 0, 0]);
    close(latLngToVector({ lat: 0, lng: 90 }), [0, 0, -1]);
    close(latLngToVector({ lat: 0, lng: -180 }), [-1, 0, 0]);
  });

  it("round-trips through vectorToLatLng", () => {
    for (const p of [{ lat: 30.03, lng: 31.47 }, { lat: -33.9, lng: 151.2 }, { lat: 51.5, lng: -0.12 }, { lat: 0, lng: -179.5 }]) {
      const back = vectorToLatLng(latLngToVector(p));
      expect(back.lat).toBeCloseTo(p.lat, 6);
      expect(back.lng).toBeCloseTo(p.lng, 6);
    }
  });
});

describe("flightPose", () => {
  const from = stagePose("earth", { lat: 30, lng: 31 });
  const to = stagePose("site", { lat: 30, lng: 31 });

  it("starts and ends exactly on the two poses", () => {
    expect(flightPose(from, to, 0)).toEqual({ dir: from.dir, altitude: from.altitude });
    const end = flightPose(from, to, 1);
    close(end.dir, to.dir);
    expect(end.altitude).toBeCloseTo(to.altitude, 9);
  });

  it("has finished turning before it has finished diving", () => {
    const mid = flightPose(from, to, 0.6);
    close(mid.dir, to.dir);
    expect(mid.altitude).toBeGreaterThan(to.altitude * 1.5);
  });

  it("only ever descends on a dive", () => {
    let last = Infinity;
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const { altitude } = flightPose(from, to, t);
      expect(altitude).toBeLessThanOrEqual(last + 1e-12);
      last = altitude;
    }
  });

  it("clamps t outside 0..1", () => {
    expect(flightPose(from, to, -1).altitude).toBeCloseTo(from.altitude);
    expect(flightPose(from, to, 2).altitude).toBeCloseTo(to.altitude);
  });
});

describe("slerp", () => {
  it("stays on the unit sphere half way round", () => {
    const m = slerp([1, 0, 0], [0, 0, 1], 0.5);
    expect(Math.hypot(...m)).toBeCloseTo(1, 9);
    close(m, [Math.SQRT1_2, 0, Math.SQRT1_2]);
  });
});

describe("facesCamera", () => {
  it("shows points under the camera and hides the far side", () => {
    const pose = { dir: [1, 0, 0] as Vec3, altitude: 2 };
    expect(facesCamera([1, 0, 0], pose)).toBe(true);
    expect(facesCamera([-1, 0, 0], pose)).toBe(false);
    expect(facesCamera([0, 1, 0], pose)).toBe(false);
  });

  it("sees less of the globe from lower down", () => {
    const point = latLngToVector({ lat: 0, lng: 40 });
    expect(facesCamera(point, { dir: [1, 0, 0], altitude: 2.4 })).toBe(true);
    expect(facesCamera(point, { dir: [1, 0, 0], altitude: 0.05 })).toBe(false);
  });
});

describe("globe stages", () => {
  it("parses the stage query and falls back to the earth", () => {
    expect(parseGlobeStage("city")).toBe("city");
    expect(parseGlobeStage(["site", "earth"])).toBe("site");
    expect(parseGlobeStage("moon")).toBe("earth");
    expect(parseGlobeStage(undefined)).toBe("earth");
  });

  it("walks up and down one level at a time", () => {
    expect(parentStage("earth")).toBeUndefined();
    expect(parentStage("city")).toBe("country");
    expect(childStage("city")).toBe("site");
    expect(childStage("site")).toBeUndefined();
  });

  it("gets lower at every level and maps altitudes back to stages", () => {
    expect(STAGE_ALTITUDE.earth).toBeGreaterThan(STAGE_ALTITUDE.country);
    expect(STAGE_ALTITUDE.country).toBeGreaterThan(STAGE_ALTITUDE.city);
    expect(STAGE_ALTITUDE.city).toBeGreaterThan(STAGE_ALTITUDE.site);
    expect(stageAtAltitude(3)).toBe("earth");
    expect(stageAtAltitude(STAGE_ALTITUDE.country)).toBe("country");
    expect(stageAtAltitude(0.05)).toBe("city");
    expect(stageAtAltitude(0.001)).toBe("site");
  });

  it("aims every stage below the earth straight at the project, and turns the earth view away from it", () => {
    const target = { lat: 30.03, lng: 31.47 };
    close(stagePose("city", target).dir, latLngToVector(target));
    const earth = vectorToLatLng(stagePose("earth", target).dir);
    expect(Math.abs(earth.lng - target.lng)).toBeGreaterThan(10);
  });

  it("wraps the earth view across the date line", () => {
    const earth = vectorToLatLng(stagePose("earth", { lat: 0, lng: 170 }).dir);
    expect(earth.lng).toBeGreaterThanOrEqual(-180);
    expect(earth.lng).toBeLessThanOrEqual(180);
  });

  it("takes longer to fly more levels, and no time to stay", () => {
    expect(flightDuration("city", "city")).toBe(0);
    expect(flightDuration("earth", "site")).toBeGreaterThan(flightDuration("city", "site"));
    expect(flightDuration("site", "earth")).toBe(flightDuration("earth", "site"));
  });
});

describe("decodeCountries", () => {
  const square = [
    [0, 0],
    [10, 0],
    [0, 10],
    [-10, 0],
    [0, -10],
  ];
  const topology: Topology = {
    type: "Topology",
    transform: { scale: [1, 1], translate: [0, 0] },
    // One square (deltas) and a hole inside it.
    arcs: [square, [[4, 4], [2, 0], [0, 2], [-2, 0], [0, -2]]],
    objects: {
      countries: {
        type: "GeometryCollection",
        geometries: [
          { type: "Polygon", id: "1", arcs: [[0], [1]], properties: { name: "Squareland" } },
          { type: "Point", id: "2" },
        ],
      },
    },
  };

  it("undoes the quantized deltas and skips non-polygons", () => {
    const [c, ...rest] = decodeCountries(topology);
    expect(rest).toEqual([]);
    expect(c.name).toBe("Squareland");
    expect(c.polygons[0][0]).toEqual([[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]);
  });

  it("honours holes", () => {
    const [c] = decodeCountries(topology);
    expect(polygonContains(c.polygons[0], [2, 2])).toBe(true);
    expect(polygonContains(c.polygons[0], [5, 5])).toBe(false);
    expect(polygonContains(c.polygons[0], [20, 5])).toBe(false);
  });

  it("finds real countries in the shipped Natural Earth data", () => {
    const shipped = JSON.parse(readFileSync(join(process.cwd(), "public/globe/countries-110m.json"), "utf8")) as Topology;
    const countries = decodeCountries(shipped);
    expect(countries.length).toBeGreaterThan(150);
    expect(countryAt(countries, [31.47, 30.03])?.name).toBe("Egypt");
    expect(countryAt(countries, [46.7, 24.7])?.name).toBe("Saudi Arabia");
    expect(countryAt(countries, [-30, 30])).toBeUndefined();
  });

  it("refuses a topology without the object", () => {
    expect(() => decodeCountries(topology, "land")).toThrow(/land/);
  });
});
