import { describe, expect, it } from "vitest";
import { parseProjectConfig, type ProjectConfig, type SceneInput, type UnitStatus } from "@/modules/schema";
import { createSceneTree, guidedTour, guidedTourStep } from "../index";

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

function config(root: SceneInput): ProjectConfig {
  const result = parseProjectConfig({
    schemaVersion: 1,
    project: {
      slug: "test",
      name: { ar: "اختبار", en: "Test" },
      defaultLocale: "ar",
      currency: "EGP",
      contact: { whatsapp: "+201001234567" },
      branding: { logo: "images/logo.svg", primaryColor: "#000000", accentColor: "#ffffff" },
    },
    root,
  });
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

const units = (rows: Record<string, UnitStatus>) => Object.entries(rows).map(([code, status]) => ({ code, status }));

const building = () =>
  createSceneTree(
    config(
      scene("facade", "facade", {
        hotspots: [toScene("ground"), toScene("first")],
        children: [
          scene("ground", "floor", { hotspots: [toUnit("G1"), toUnit("G2")] }),
          scene("first", "floor", { hotspots: [toUnit("F1"), toUnit("F2")] }),
          scene("tour-f2", "unit-plan", {
            type: "panorama-360",
            image: { path: "images/f2.jpg", width: 200, height: 100 },
            panorama: { path: "panoramas/f2.jpg", width: 200, height: 100 },
            showsUnits: ["F2"],
          }),
        ],
      }),
    ),
  );

describe("guidedTour", () => {
  it("ends on the first available unit, through the hotspots that lead to it", () => {
    const tour = guidedTour(building(), units({ G1: "sold", G2: "available", F1: "available", F2: "reserved" }));
    expect(tour).toEqual({ scenes: ["facade", "ground"], unit: { code: "G2", hotspotId: "u-g2" } });
  });

  it("prefers an available unit with a 360° view, and enters that view at the end", () => {
    const tour = guidedTour(building(), units({ G1: "available", G2: "available", F1: "sold", F2: "available" }));
    expect(tour).toEqual({ scenes: ["facade", "first"], unit: { code: "F2", hotspotId: "u-f2" }, viewSceneId: "tour-f2" });
  });

  it("still finds a unit when everything is sold, the one with a 360° view first", () => {
    expect(guidedTour(building(), units({ G1: "sold", G2: "sold", F1: "sold", F2: "sold" }))?.unit.code).toBe("F2");
  });

  it("expands typical floors and names the floor", () => {
    const tree = createSceneTree(
      config(
        scene("tower", "building", {
          hotspots: [toScene("typical")],
          children: [
            scene("typical", "floor", {
              floors: { from: 2, to: 4, unitCode: "{floor}{suffix}" },
              hotspots: [{ id: "a", points: square, target: { unitSuffix: "A" } }],
            }),
          ],
        }),
      ),
    );
    const tour = guidedTour(tree, units({ "2A": "sold", "3A": "available", "4A": "available" }));
    expect(tour).toEqual({ scenes: ["tower", "typical"], unit: { code: "3A", hotspotId: "a", floor: 3 } });
  });

  it("has nothing to show when no unit is drawn", () => {
    expect(guidedTour(createSceneTree(config(scene("facade", "facade"))), [])).toBeUndefined();
  });
});

describe("guidedTourStep", () => {
  const tree = building();
  const tour = guidedTour(tree, units({ G1: "available", G2: "available", F1: "sold", F2: "available" }))!;

  it("zooms into the hotspot of the next scene", () => {
    expect(guidedTourStep(tree, tour, "facade")).toEqual({ kind: "scene", hotspotId: "to-first", sceneId: "first" });
  });

  it("shows the unit on the last scene", () => {
    expect(guidedTourStep(tree, tour, "first")).toEqual({ kind: "unit", hotspotId: "u-f2", code: "F2", viewSceneId: "tour-f2" });
  });

  it("does nothing off the path", () => {
    expect(guidedTourStep(tree, tour, "ground")).toBeUndefined();
  });
});
