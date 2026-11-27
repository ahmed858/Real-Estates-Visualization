import { describe, expect, it } from "vitest";
import { formatMegabytes, MAX_MODEL_BYTES, MAX_PANORAMA_BYTES, MAX_ROTATION_FRAME_BYTES, projectFileSizeLimit } from "../index";

describe("projectFileSizeLimit", () => {
  it("limits rotation frames, 3D models and panoramas only", () => {
    expect(projectFileSizeLimit("panoramas/living.jpg")).toEqual({ bytes: MAX_PANORAMA_BYTES, label: "360° panoramas" });
    expect(projectFileSizeLimit("rotations/tower/frame-01.jpg")).toEqual({ bytes: MAX_ROTATION_FRAME_BYTES, label: "rotation frames" });
    expect(projectFileSizeLimit("models/tower.glb")).toEqual({ bytes: MAX_MODEL_BYTES, label: "3D models" });
    expect(projectFileSizeLimit("models/Tower.GLB")?.bytes).toBe(MAX_MODEL_BYTES);
    expect(projectFileSizeLimit("images/facade.jpg")).toBeUndefined();
    expect(projectFileSizeLimit("images/rotations/x.jpg")).toBeUndefined();
  });
});

describe("formatMegabytes", () => {
  it("prints whole and fractional megabytes", () => {
    expect(formatMegabytes(MAX_ROTATION_FRAME_BYTES)).toBe("2 MB");
    expect(formatMegabytes(1.44 * 1024 * 1024)).toBe("1.4 MB");
  });
});
