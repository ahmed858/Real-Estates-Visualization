import { describe, expect, it } from "vitest";
import type { Scene } from "@/modules/schema";
import { createSceneTree, premiumViews } from "../index";

const sq: [number, number][] = [[0, 0], [10, 0], [10, 10]];
const image = { path: "images/a.jpg", width: 100, height: 100 };
const s = (id: string, extra: Partial<Scene> = {}): Scene => ({ id, kind: "other", type: "image-2d", title: { ar: id, en: id }, image, hotspots: [], children: [], ...extra });
const model = (id: string) => s(id, { type: "model-3d", model: { path: "models/a.glb" } });
const pano = (id: string) => s(id, { type: "panorama-360", panorama: { path: "panoramas/a.jpg", width: 200, height: 100 } });

const tree = () =>
  createSceneTree({
    root: s("facade", {
      hotspots: [{ id: "f1", points: sq, target: { scene: "floor-1" } }, { id: "spin", points: sq, target: { scene: "linked-3d" } }],
      children: [s("floor-1", { kind: "floor", children: [pano("room")] }), model("building-3d"), pano("roof"), model("linked-3d")],
    }),
  });

describe("premiumViews", () => {
  it("offers the premium children that no hotspot opens, in tree order", () => {
    expect(premiumViews(tree(), "facade").map((v) => v.id)).toEqual(["building-3d", "roof"]);
    expect(premiumViews(tree(), "floor-1").map((v) => v.id)).toEqual(["room"]);
  });

  it("offers the premium siblings while a premium scene is open, itself included as the current one", () => {
    expect(premiumViews(tree(), "building-3d").map((v) => v.id)).toEqual(["building-3d", "roof", "linked-3d"]);
  });

  it("offers nothing on a 2D scene without premium children", () => {
    expect(premiumViews(createSceneTree({ root: s("only") }), "only")).toEqual([]);
  });
});
