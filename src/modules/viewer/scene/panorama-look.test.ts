import { describe, expect, it } from "vitest";
import { DEFAULT_LOOK, dragLook, keyLook, lookDirection, MAX_FOV, MAX_PITCH, MIN_FOV, normaliseLook, wrapYaw, zoomLook } from "./panorama-look";

describe("panorama look", () => {
  it("wraps yaw into [-180, 180)", () => {
    expect(wrapYaw(190)).toBe(-170);
    expect(wrapYaw(-190)).toBe(170);
    expect(wrapYaw(180)).toBe(-180);
    expect(wrapYaw(720 + 15)).toBe(15);
  });

  it("clamps pitch and field of view", () => {
    expect(normaliseLook({ yaw: 0, pitch: 120, fov: 10 })).toEqual({ yaw: 0, pitch: MAX_PITCH, fov: MIN_FOV });
    expect(normaliseLook({ yaw: 0, pitch: -120, fov: 200 })).toEqual({ yaw: 0, pitch: -MAX_PITCH, fov: MAX_FOV });
  });

  it("moves the picture with the pointer at the speed of the field of view", () => {
    // Dragging right by a full view height turns left by one field of view.
    expect(dragLook(DEFAULT_LOOK, 600, 0, 600)).toEqual({ ...DEFAULT_LOOK, yaw: -75 });
    expect(dragLook(DEFAULT_LOOK, 0, 300, 600).pitch).toBeCloseTo(37.5);
  });

  it("zooms within limits", () => {
    expect(zoomLook(DEFAULT_LOOK, -10).fov).toBe(65);
    expect(zoomLook(DEFAULT_LOOK, 1000).fov).toBe(MAX_FOV);
  });

  it("turns with the arrow keys, flipped for right-to-left pages", () => {
    expect(keyLook(DEFAULT_LOOK, "ArrowRight")?.yaw).toBe(10);
    expect(keyLook(DEFAULT_LOOK, "ArrowRight", true)?.yaw).toBe(-10);
    expect(keyLook(DEFAULT_LOOK, "ArrowUp")?.pitch).toBe(10);
    expect(keyLook(DEFAULT_LOOK, "+")?.fov).toBe(65);
    expect(keyLook(DEFAULT_LOOK, "a")).toBeUndefined();
  });

  it("points at the picture centre for yaw 0 and to its right for yaw 90", () => {
    const [x, y, z] = lookDirection({ yaw: 0, pitch: 0 });
    expect([x, y, z].map((v) => Math.round(v * 1000) / 1000)).toEqual([1, 0, 0]);
    expect(lookDirection({ yaw: 90, pitch: 0 })[2]).toBeCloseTo(1);
    expect(lookDirection({ yaw: 0, pitch: 90 })[1]).toBeCloseTo(1);
  });
});
