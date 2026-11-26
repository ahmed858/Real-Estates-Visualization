// Small fixture project for viewer tests: a tower whose floors 1 to 3 share
// one typical plan with two units (A and B). Not the demo villa.
import type { Scene } from "@/modules/schema";
import type { UnitSummary } from "../scene/hover-card";

export const typicalFloor: Scene = {
  id: "typical",
  kind: "floor",
  type: "image-2d",
  title: { ar: "الدور المتكرر", en: "Typical floor" },
  image: { path: "images/typical.svg", width: 400, height: 200 },
  floors: { from: 1, to: 3, unitCode: "{floor}{suffix}" },
  hotspots: [
    { id: "a", points: [[0, 0], [200, 0], [200, 200], [0, 200]], target: { unitSuffix: "A" } },
    { id: "b", points: [[200, 0], [400, 0], [400, 200], [200, 200]], target: { unitSuffix: "B" } },
  ],
  children: [],
};

/** Concrete floors as the page builds them from SceneTree.concreteFloors. */
export const towerFloors = [1, 2, 3].map((floor) => ({ floor, codes: { a: `${floor}A`, b: `${floor}B` } }));

const unit = (code: string, floor: number, status: UnitSummary["status"]): UnitSummary => ({
  code,
  type: "Apartment",
  floor,
  bedrooms: 2,
  bathrooms: 1,
  areaM2: 100 + floor,
  price: 1000000 + floor * 10000,
  status,
});

export const towerUnits: Record<string, UnitSummary> = Object.fromEntries(
  [unit("1A", 1, "sold"), unit("1B", 1, "available"), unit("2A", 2, "available"), unit("2B", 2, "reserved"), unit("3A", 3, "reserved"), unit("3B", 3, "sold")].map((u) => [u.code, u]),
);
