import { describe, expect, it } from "vitest";
import { parseProjectConfig, type SceneInput, type UnitRow, type UnitStatus } from "@/modules/schema";
import { computeSceneStats, createSceneTree, filterUnits, sumStats } from "../index";

const square: [number, number][] = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
];
const scene = (id: string, kind: SceneInput["kind"], rest: Partial<SceneInput> = {}): SceneInput => ({
  id,
  kind,
  title: { ar: id, en: id },
  image: { path: `images/${id}.svg`, width: 100, height: 100 },
  ...rest,
});
const toScene = (id: string) => ({ id: `to-${id}`, points: square, target: { scene: id } });
const toUnit = (code: string) => ({ id: `u-${code.toLowerCase()}`, points: square, target: { unit: code } });

function tree(root: SceneInput) {
  const result = parseProjectConfig({
    schemaVersion: 1,
    project: {
      slug: "t",
      name: { ar: "ت", en: "T" },
      defaultLocale: "en",
      currency: "EGP",
      contact: { whatsapp: "+201001234567" },
      branding: { logo: "l.svg", primaryColor: "#000000", accentColor: "#ffffff" },
    },
    root,
  });
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return createSceneTree(result.value);
}

let row = 1;
const unit = (code: string, status: UnitStatus, price: number, areaM2: number, extra: Partial<UnitRow> = {}): UnitRow => ({
  code,
  scene: "x",
  floor: 0,
  type: "Apartment",
  bedrooms: 2,
  bathrooms: 1,
  areaM2,
  price,
  status,
  sheetRow: ++row,
  ...extra,
});

const villa = tree(
  scene("facade", "facade", {
    hotspots: [toScene("ground"), toScene("first")],
    children: [
      scene("ground", "floor", { hotspots: [toUnit("G-01"), toUnit("G-02")] }),
      scene("first", "floor", { hotspots: [toUnit("F-01")] }),
    ],
  }),
);
const villaUnits = [
  unit("G-01", "available", 4_000_000, 150, { floor: 0, bedrooms: 3 }),
  unit("G-02", "sold", 4_400_000, 160, { floor: 0, bedrooms: 3, type: "Duplex" }),
  unit("F-01", "reserved", 3_500_000, 120, { floor: 1, bedrooms: 2 }),
  unit("X-99", "available", 1, 1),
];

describe("computeSceneStats", () => {
  const stats = computeSceneStats(villa, villaUnits);

  it("counts a floor's own units by status with price and area ranges", () => {
    expect(stats.get("ground")).toEqual({
      total: 2,
      byStatus: { available: 1, reserved: 0, sold: 1 },
      price: { min: 4_000_000, max: 4_400_000 },
      area: { min: 150, max: 160 },
    });
  });

  it("rolls floors up to the facade and ignores units no hotspot draws", () => {
    expect(stats.get("facade")).toEqual({
      total: 3,
      byStatus: { available: 1, reserved: 1, sold: 1 },
      price: { min: 3_500_000, max: 4_400_000 },
      area: { min: 120, max: 160 },
    });
  });

  it("gives empty stats for a scene without units", () => {
    const t = tree(scene("root", "facade", { hotspots: [toScene("empty")], children: [scene("empty", "floor")] }));
    expect(computeSceneStats(t, villaUnits).get("empty")).toEqual({
      total: 0,
      byStatus: { available: 0, reserved: 0, sold: 0 },
      price: null,
      area: null,
    });
  });

  it("counts expanded typical floor units and rolls them up through a compound", () => {
    const t = tree(
      scene("masterplan", "masterplan", {
        hotspots: [toScene("b1"), toScene("b2")],
        children: [
          scene("b1", "building", {
            hotspots: [toScene("typical")],
            children: [
              scene("typical", "floor", {
                floors: { from: 1, to: 2, unitCode: "{floor}{suffix}" },
                hotspots: [{ id: "a", points: square, target: { unitSuffix: "A" } }],
              }),
            ],
          }),
          scene("b2", "building", { hotspots: [toUnit("B2-01")] }),
        ],
      }),
    );
    const s = computeSceneStats(t, [
      unit("1A", "sold", 100, 50),
      unit("2A", "available", 200, 60),
      unit("B2-01", "available", 300, 70),
    ]);
    expect(s.get("typical")?.byStatus).toEqual({ available: 1, reserved: 0, sold: 1 });
    expect(s.get("b1")?.total).toBe(2);
    expect(s.get("masterplan")).toMatchObject({ total: 3, price: { min: 100, max: 300 } });
  });

  it("counts a unit drawn on two scenes once on their shared ancestor", () => {
    const t = tree(
      scene("facade", "facade", {
        hotspots: [toScene("plan"), toUnit("G-01")],
        children: [scene("plan", "floor", { hotspots: [toUnit("G-01")] })],
      }),
    );
    const s = computeSceneStats(t, villaUnits);
    expect(s.get("plan")?.total).toBe(1);
    expect(s.get("facade")?.total).toBe(1);
  });
});

describe("sumStats", () => {
  it("adds counts and merges ranges", () => {
    const s = computeSceneStats(villa, villaUnits);
    const sum = sumStats([s.get("ground")!, s.get("first")!]);
    expect(sum).toEqual(s.get("facade"));
  });
});

describe("filterUnits", () => {
  const codes = (u: UnitRow[]) => u.map((x) => x.code);

  it("returns everything for an empty filter", () => {
    expect(codes(filterUnits(villaUnits, {}))).toEqual(["G-01", "G-02", "F-01", "X-99"]);
    expect(codes(filterUnits(villaUnits, { status: [], type: [] }))).toHaveLength(4);
  });

  it("filters by status, type (case-insensitive), bedrooms and floor", () => {
    expect(codes(filterUnits(villaUnits, { status: ["available", "reserved"] }))).toEqual(["G-01", "F-01", "X-99"]);
    expect(codes(filterUnits(villaUnits, { type: [" duplex "] }))).toEqual(["G-02"]);
    expect(codes(filterUnits(villaUnits, { bedrooms: [3] }))).toEqual(["G-01", "G-02"]);
    expect(codes(filterUnits(villaUnits, { floor: [1] }))).toEqual(["F-01"]);
  });

  it("filters by inclusive price and area ranges, open on either side", () => {
    expect(codes(filterUnits(villaUnits, { price: { min: 3_500_000, max: 4_000_000 } }))).toEqual(["G-01", "F-01"]);
    expect(codes(filterUnits(villaUnits, { area: { min: 155 } }))).toEqual(["G-02"]);
    expect(codes(filterUnits(villaUnits, { area: { max: 120 } }))).toEqual(["F-01", "X-99"]);
  });

  it("combines criteria with AND", () => {
    expect(codes(filterUnits(villaUnits, { status: ["available"], bedrooms: [3], price: { max: 5_000_000 } }))).toEqual(["G-01"]);
    expect(filterUnits(villaUnits, { status: ["sold"], floor: [1] })).toEqual([]);
  });
});
