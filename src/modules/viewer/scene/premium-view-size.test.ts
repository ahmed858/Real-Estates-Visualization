import { describe, expect, it } from "vitest";
import { PREMIUM_VIEW_CLASS, premiumViewStyle } from "./premium-view-size";

describe("premium view size", () => {
  it("passes the poster's aspect ratio to the desktop width limit", () => {
    expect(premiumViewStyle({ width: 1600, height: 800 })).toEqual({ "--premium-aspect": "2" });
    expect(PREMIUM_VIEW_CLASS).toMatch(/^md:max-w-\[calc\(.*var\(--premium-aspect\)\)\]$/);
  });
});
