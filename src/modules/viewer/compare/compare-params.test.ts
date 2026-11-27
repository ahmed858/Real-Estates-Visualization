import { describe, expect, it } from "vitest";
import { MAX_COMPARED, parseCompareCodes, togglePicked, withCodes } from "./compare-params";

const known = new Set(["G-01", "G-02", "F-01", "F-02"]);

describe("parseCompareCodes", () => {
  it("reads comma-separated codes in order", () => {
    expect(parseCompareCodes("F-01,G-01", known)).toEqual(["F-01", "G-01"]);
  });

  it("skips unknown, empty and repeated codes and trims spaces", () => {
    expect(parseCompareCodes(" G-01 ,X-99,,G-01,G-02", known)).toEqual(["G-01", "G-02"]);
  });

  it(`keeps at most ${MAX_COMPARED}`, () => {
    expect(parseCompareCodes("G-01,G-02,F-01,F-02", known)).toEqual(["G-01", "G-02", "F-01"]);
  });

  it("accepts a repeated parameter and nothing at all", () => {
    expect(parseCompareCodes(["G-02", "F-02,G-02"], known)).toEqual(["G-02", "F-02"]);
    expect(parseCompareCodes(undefined, known)).toEqual([]);
  });
});

describe("togglePicked", () => {
  it("adds a code, removes it again, and stops at the limit", () => {
    expect(togglePicked([], "G-01")).toEqual(["G-01"]);
    expect(togglePicked(["G-01", "G-02"], "G-01")).toEqual(["G-02"]);
    expect(togglePicked(["G-01", "G-02", "F-01"], "F-02")).toEqual(["G-01", "G-02", "F-01"]);
  });
});

describe("withCodes", () => {
  it("sets the parameter with readable commas and keeps ?lang=", () => {
    expect(withCodes("/p/demo/compare?lang=en", "units", ["G-01", "F-01"])).toBe("/p/demo/compare?lang=en&units=G-01,F-01");
    expect(withCodes("/p/demo/units", "compare", ["G-01"])).toBe("/p/demo/units?compare=G-01");
  });
});
