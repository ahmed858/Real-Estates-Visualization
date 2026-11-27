import { describe, expect, it } from "vitest";
import type { Hotspot } from "@/modules/schema";
import { hotspotForObject, meshHotspots, meshTint, supportsWebGL } from "./model-3d-mapping";
import { STATUS_STYLE } from "./status-style";

const sq: [number, number][] = [[0, 0], [1, 0], [1, 1]];
const hotspots: Hotspot[] = [
  { id: "a", points: sq, mesh: "Unit_A1", target: { unit: "A-1" } },
  { id: "b", points: sq, mesh: "Unit_B1", target: { unit: "B-1" } },
  { id: "dup", points: sq, mesh: "Unit_A1", target: { unit: "X-9" } },
  { id: "plain", points: sq, target: { unit: "C-1" } },
  { id: "tower", points: sq, mesh: "Tower2", target: { scene: "tower-2" } },
];

describe("meshHotspots", () => {
  it("maps each mesh name to the first hotspot naming it and skips hotspots without a mesh", () => {
    const map = meshHotspots({ hotspots });
    expect([...map.keys()]).toEqual(["Unit_A1", "Unit_B1", "Tower2"]);
    expect(map.get("Unit_A1")?.id).toBe("a");
  });
});

describe("hotspotForObject", () => {
  const map = meshHotspots({ hotspots });
  it("finds the hotspot of the object or of its nearest named ancestor", () => {
    const parent = { name: "Unit_B1", parent: { name: "Scene", parent: null } };
    const child = { name: "Unit_B1_glass", parent };
    expect(hotspotForObject(parent, map)?.id).toBe("b");
    expect(hotspotForObject(child, map)?.id).toBe("b");
  });
  it("returns undefined for objects outside any hotspot, and for no object", () => {
    expect(hotspotForObject({ name: "Ground", parent: { name: "Scene", parent: null } }, map)).toBeUndefined();
    expect(hotspotForObject(null, map)).toBeUndefined();
  });
});

describe("meshTint", () => {
  const statusOf = (h: Hotspot) => (h.id === "a" ? "available" : h.id === "b" ? "sold" : undefined);
  it("tints units by status, scene links in the scene colour, and leaves unknown units untinted", () => {
    expect(meshTint(hotspots[0], statusOf)).toBe(STATUS_STYLE.available.color);
    expect(meshTint(hotspots[1], statusOf)).toBe(STATUS_STYLE.sold.color);
    expect(meshTint(hotspots[4], statusOf)).toBe(STATUS_STYLE.scene.color);
    expect(meshTint(hotspots[2], statusOf)).toBeUndefined();
  });
});

describe("supportsWebGL", () => {
  it("is true when a webgl2 or webgl context is created, false otherwise or on errors", () => {
    expect(supportsWebGL(() => ({ getContext: (id) => (id === "webgl" ? {} : null) }))).toBe(true);
    expect(supportsWebGL(() => ({ getContext: () => null }))).toBe(false);
    expect(supportsWebGL(() => undefined)).toBe(false);
    expect(
      supportsWebGL(() => ({
        getContext: () => {
          throw new Error("blocked");
        },
      })),
    ).toBe(false);
  });
});
