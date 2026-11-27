import { describe, expect, it } from "vitest";
import { brandStyle } from "./brand-style";

describe("brandStyle", () => {
  it("exposes the brand colours and a readable text colour on each", () => {
    expect(brandStyle({ primary: "#1a6b4f", accent: "#c89b3c" })).toEqual({
      "--brand-primary": "#1a6b4f",
      "--brand-accent": "#c89b3c",
      "--brand-on-primary": "#ffffff",
      "--brand-on-accent": "#000000",
    });
  });

  it("picks black text on a light primary and white on a dark accent", () => {
    const style = brandStyle({ primary: "#f1e3c8", accent: "#5b4636" }) as Record<string, string>;
    expect(style["--brand-on-primary"]).toBe("#000000");
    expect(style["--brand-on-accent"]).toBe("#ffffff");
  });
});
