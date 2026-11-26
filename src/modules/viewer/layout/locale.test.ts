import { describe, expect, it } from "vitest";
import { otherLocale, resolveLocale, withLocale } from "../index";

describe("resolveLocale", () => {
  it("uses a supported ?lang= value", () => {
    expect(resolveLocale("en", "ar")).toBe("en");
    expect(resolveLocale("ar", "en")).toBe("ar");
  });

  it("falls back to the project default for a missing or unknown value", () => {
    expect(resolveLocale(undefined, "ar")).toBe("ar");
    expect(resolveLocale(null, "en")).toBe("en");
    expect(resolveLocale("fr", "ar")).toBe("ar");
    expect(resolveLocale("", "ar")).toBe("ar");
  });

  it("takes the first of a repeated parameter", () => {
    expect(resolveLocale(["en", "ar"], "ar")).toBe("en");
  });
});

describe("withLocale", () => {
  it("adds lang only when it differs from the project default", () => {
    expect(withLocale("/p/demo-villa/ground", "en", "ar")).toBe("/p/demo-villa/ground?lang=en");
    expect(withLocale("/p/demo-villa/ground", "ar", "ar")).toBe("/p/demo-villa/ground");
  });

  it("keeps other parameters and replaces an existing lang", () => {
    expect(withLocale("/p/x/typical?floor=2&unit=2B&lang=en", "ar", "ar")).toBe("/p/x/typical?floor=2&unit=2B");
    expect(withLocale("/p/x/typical?floor=2&unit=2B", "en", "ar")).toBe("/p/x/typical?floor=2&unit=2B&lang=en");
  });

  it("toggles between the two locales", () => {
    expect(otherLocale("ar")).toBe("en");
    expect(otherLocale("en")).toBe("ar");
  });
});
