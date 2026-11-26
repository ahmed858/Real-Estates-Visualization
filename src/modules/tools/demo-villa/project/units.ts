// The demo villa's units sheet: one row per unit in the geometry, with mixed
// statuses. Prices and statuses are demo values.
import { UNIT_COLUMNS } from "@/modules/schema";
import type { XlsxCell } from "../../xlsx/write-xlsx";
import type { FloorGeometry, UnitGeometry, VillaGeometry } from "../geometry/types";

interface SalesInfo {
  price: number;
  status: string;
}

/** Demo sales data per unit code. The Arabic status shows that both spellings work. */
const SALES: Record<string, SalesInfo> = {
  "G-01": { price: 3950000, status: "available" },
  "G-02": { price: 4050000, status: "reserved" },
  "F-01": { price: 3600000, status: "sold" },
  "F-02": { price: 3650000, status: "available" },
  "R-01": { price: 2200000, status: "محجوز" },
};

const count = (unit: UnitGeometry, prefix: string) => unit.rooms.filter((r) => r.id.startsWith(prefix)).length;

function notes(unit: UnitGeometry): string | null {
  const outdoor = unit.rooms.filter((r) => r.kind === "outdoor");
  if (outdoor.length === 0) return null;
  const outdoorArea = Math.round((unit.areaM2 - unit.indoorAreaM2) * 100) / 100;
  return outdoor.some((r) => r.id === "courtyard") ? `Private courtyard ${outdoorArea} m²` : `Roof terraces ${outdoorArea} m²`;
}

function row(floor: FloorGeometry, unit: UnitGeometry): XlsxCell[] {
  const sales = SALES[unit.code];
  if (!sales) throw new Error(`no demo sales data for unit ${unit.code}`);
  const values: Record<(typeof UNIT_COLUMNS)[number], XlsxCell> = {
    code: unit.code,
    scene: floor.id,
    floor: floor.level,
    type: unit.type,
    bedrooms: count(unit, "bedroom") + count(unit, "annex-room"),
    bathrooms: count(unit, "bath"),
    area_m2: unit.indoorAreaM2,
    price: sales.price,
    status: sales.status,
    plan_image: null,
    notes: notes(unit),
  };
  return UNIT_COLUMNS.map((c) => values[c]);
}

/** Header row plus one row per unit, floor by floor. */
export function demoVillaUnitRows(villa: VillaGeometry): XlsxCell[][] {
  return [[...UNIT_COLUMNS], ...villa.floors.flatMap((f) => f.units.map((u) => row(f, u)))];
}
