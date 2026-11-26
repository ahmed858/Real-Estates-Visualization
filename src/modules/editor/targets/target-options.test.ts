import { describe, expect, it } from "vitest";
import { parseProjectConfig, type ProjectConfig } from "@/modules/schema";
import { hotspotIds, makeTarget, suffixOf, suggestHotspotId, targetOptions, toId } from "../index";

const title = (en: string) => ({ ar: `عربي ${en}`, en });
const tri: [number, number][] = [
  [0, 0],
  [10, 0],
  [10, 10],
];
const image = { path: "images/x.svg", width: 100, height: 100 };

function config(): ProjectConfig {
  const parsed = parseProjectConfig({
    schemaVersion: 1,
    project: {
      slug: "demo",
      name: title("Demo"),
      defaultLocale: "en",
      currency: "EGP",
      contact: { whatsapp: "+201001234567" },
      branding: { logo: "images/logo.svg", primaryColor: "#1a6b4f", accentColor: "#c89b3c" },
    },
    root: {
      id: "facade",
      kind: "facade",
      title: title("Facade"),
      image,
      hotspots: [{ id: "band-ground", points: tri, target: { scene: "ground" } }],
      children: [
        { id: "ground", kind: "floor", title: title("Ground"), image, hotspots: [{ id: "g-01", points: tri, target: { unit: "G-01" } }] },
        {
          id: "typical",
          kind: "floor",
          title: title("Typical"),
          image,
          floors: { from: 2, to: 3, unitCode: "T{floor}-{suffix}" },
          hotspots: [{ id: "unit-a", points: tri, target: { unitSuffix: "A" } }],
        },
      ],
    },
  });
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.errors));
  return parsed.value;
}

const codes = ["G-02", "G-01", "T2-A", "T2-B", "T3-A", "T3-B", "T3-C", "X-9"];

describe("targetOptions", () => {
  it("offers child scenes and unit codes on a normal scene, units not yet drawn first", () => {
    const options = targetOptions(config(), "facade", codes);
    expect(options.kinds).toEqual(["scene", "unit"]);
    expect(options.scenes).toEqual([
      { id: "ground", title: "Ground" },
      { id: "typical", title: "Typical" },
    ]);
    // G-01 is drawn on ground; T2-A and T3-A are drawn through the typical floor's suffix A.
    expect(options.units.filter((u) => !u.drawn).map((u) => u.value)).toEqual(["G-02", "T2-B", "T3-B", "T3-C", "X-9"]);
    expect(options.units.slice(5).map((u) => u.value)).toEqual(["G-01", "T2-A", "T3-A"]);
    expect(options.units.slice(5).every((u) => u.drawn)).toBe(true);
    expect(options.suffixes).toEqual([]);
  });

  it("offers no child scenes on a leaf scene", () => {
    expect(targetOptions(config(), "ground", codes).scenes).toEqual([]);
  });

  it("offers only unit suffixes on a typical floor, found from the floor's code template", () => {
    const options = targetOptions(config(), "typical", codes);
    expect(options.kinds).toEqual(["unitSuffix"]);
    expect(options.units).toEqual([]);
    expect(options.suffixes).toEqual([
      { value: "B", drawn: false },
      { value: "C", drawn: false },
      { value: "A", drawn: true },
    ]);
  });

  it("lists each code once even when the sheet repeats it", () => {
    expect(targetOptions(config(), "ground", ["G-02", "G-02"]).units).toEqual([{ value: "G-02", drawn: false }]);
  });
});

describe("suffixOf", () => {
  const floors = { from: 2, to: 10, unitCode: "{floor}{suffix}" };
  it("finds the suffix for any floor in the range", () => {
    expect(suffixOf("201", floors)).toBe("01");
    expect(suffixOf("1004", floors)).toBe("04");
  });
  it("ignores codes outside the range or template", () => {
    expect(suffixOf("101", { ...floors, unitCode: "F{floor}-{suffix}" })).toBeUndefined();
    expect(suffixOf("F11-A", { ...floors, unitCode: "F{floor}-{suffix}" })).toBeUndefined();
    expect(suffixOf("F2-", { ...floors, unitCode: "F{floor}-{suffix}" })).toBeUndefined();
  });
});

describe("suggestHotspotId", () => {
  const none = new Set<string>();
  it("suggests an id from each target form", () => {
    expect(suggestHotspotId(makeTarget("scene", "ground"), none)).toBe("ground");
    expect(suggestHotspotId(makeTarget("unit", "G-01"), none)).toBe("g-01");
    expect(suggestHotspotId(makeTarget("unit", "Villa 1/A"), none)).toBe("villa-1-a");
    expect(suggestHotspotId(makeTarget("unitSuffix", "A"), none)).toBe("unit-a");
  });
  it("adds a number when the id is taken, and falls back for text with no letters or digits", () => {
    expect(suggestHotspotId({ unit: "G-01" }, new Set(["g-01", "g-01-2"]))).toBe("g-01-3");
    expect(suggestHotspotId({ unit: "شقة" }, none)).toBe("hotspot");
  });
  it("only suggests ids the schema accepts", () => {
    expect(toId("--A__b  9--")).toBe("a-b-9");
  });
});

describe("hotspotIds", () => {
  it("collects ids from every scene", () => {
    expect([...hotspotIds(config())].sort()).toEqual(["band-ground", "g-01", "unit-a"]);
  });
});
