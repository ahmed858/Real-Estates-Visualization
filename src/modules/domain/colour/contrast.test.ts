import { describe, expect, it } from "vitest";
import { BLACK, colorDifference, contrastRatio, parseHexColor, readableTextColor, relativeLuminance, WHITE } from "./contrast";

describe("parseHexColor", () => {
  it("reads 6-digit and 3-digit hex in any case", () => {
    expect(parseHexColor("#1A6b4f")).toEqual({ r: 0x1a, g: 0x6b, b: 0x4f });
    expect(parseHexColor("#fa0")).toEqual({ r: 0xff, g: 0xaa, b: 0x00 });
  });

  it("rejects anything that is not a hex colour", () => {
    for (const bad of ["1a6b4f", "#12345", "#ggg", "red", ""]) expect(() => parseHexColor(bad)).toThrow();
  });
});

describe("relativeLuminance", () => {
  it("is 0 for black, 1 for white and matches WCAG for a mid grey", () => {
    expect(relativeLuminance(BLACK)).toBe(0);
    expect(relativeLuminance(WHITE)).toBeCloseTo(1, 10);
    // #777777: channel 0.4667 -> linear 0.1845
    expect(relativeLuminance("#777777")).toBeCloseTo(0.1845, 4);
  });
});

describe("contrastRatio", () => {
  it("is 21 for black on white and 1 for a colour on itself, in either order", () => {
    expect(contrastRatio(BLACK, WHITE)).toBeCloseTo(21, 10);
    expect(contrastRatio(WHITE, BLACK)).toBeCloseTo(21, 10);
    expect(contrastRatio("#1a6b4f", "#1a6b4f")).toBe(1);
  });

  it("matches known WCAG values", () => {
    // #777777 on white is the classic 4.48:1 that just fails AA.
    expect(contrastRatio("#777777", WHITE)).toBeCloseTo(4.48, 2);
    expect(contrastRatio("#2b8a3e", WHITE)).toBeCloseTo(4.4, 1);
  });
});

describe("readableTextColor", () => {
  it("picks white on dark colours and black on light ones", () => {
    expect(readableTextColor("#1a6b4f")).toBe(WHITE);
    expect(readableTextColor("#09090b")).toBe(WHITE);
    expect(readableTextColor("#c89b3c")).toBe(BLACK);
    expect(readableTextColor("#ffffff")).toBe(BLACK);
  });

  it("always reaches at least 4.5:1 for any grey", () => {
    for (let v = 0; v <= 255; v += 5) {
      const hex = `#${v.toString(16).padStart(2, "0").repeat(3)}`;
      expect(contrastRatio(hex, readableTextColor(hex))).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("colorDifference", () => {
  it("is 0 for the same colour and symmetric", () => {
    expect(colorDifference("#c92a2a", "#C92A2A")).toBe(0);
    expect(colorDifference("#c92a2a", "#2b8a3e")).toBeCloseTo(colorDifference("#2b8a3e", "#c92a2a"), 10);
  });

  it("is 100 between black and white (the full lightness range)", () => {
    expect(colorDifference(BLACK, WHITE)).toBeCloseTo(100, 1);
  });

  it("is small for near shades and large for different hues", () => {
    expect(colorDifference("#2b8a3e", "#2f8f42")).toBeLessThan(5);
    expect(colorDifference("#2b8a3e", "#c92a2a")).toBeGreaterThan(50);
  });
});
