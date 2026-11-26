// Cross-checks between a valid config and valid unit rows. Pure functions, no I/O.
import type { ProjectConfig, UnitRow } from "@/modules/schema";
import type { SceneTree } from "@/modules/domain";
import type { Finding } from "./report";

export const CONFIG_FILE = "project.json";
export const UNITS_FILE = "units.xlsx";

/** Every unit code drawn on a scene must exist in the sheet. */
export function hotspotUnitsExistInSheet(tree: SceneTree, units: readonly UnitRow[]): Finding[] {
  const codes = new Set(units.map((u) => u.code));
  return tree
    .placedUnits()
    .filter((p) => !codes.has(p.code))
    .map((p) => ({
      severity: "error" as const,
      file: CONFIG_FILE,
      location: `scene "${p.sceneId}", hotspot "${p.hotspotId}"`,
      message: `unit "${p.code}" is not in ${UNITS_FILE}`,
    }));
}

/** Every unit in the sheet must be drawn on some scene. */
export function sheetUnitsArePlaced(tree: SceneTree, units: readonly UnitRow[]): Finding[] {
  const placed = new Set(tree.unitCodes());
  return units
    .filter((u) => !placed.has(u.code))
    .map((u) => ({
      severity: "error" as const,
      file: UNITS_FILE,
      location: `row ${u.sheetRow}, code`,
      message: `unit "${u.code}" is not drawn on any scene`,
    }));
}

/** A unit's `scene` column should name a scene that exists and that draws it. Warning only. */
export function sheetScenesMatch(tree: SceneTree, units: readonly UnitRow[]): Finding[] {
  const drawnOn = new Map<string, Set<string>>();
  for (const p of tree.placedUnits()) {
    if (!drawnOn.has(p.code)) drawnOn.set(p.code, new Set());
    drawnOn.get(p.code)?.add(p.sceneId);
  }
  const findings: Finding[] = [];
  for (const u of units) {
    const location = `row ${u.sheetRow}, scene`;
    if (!tree.has(u.scene)) {
      findings.push({ severity: "warning", file: UNITS_FILE, location, message: `scene "${u.scene}" does not exist` });
      continue;
    }
    const scenes = drawnOn.get(u.code);
    if (scenes && !scenes.has(u.scene)) {
      findings.push({
        severity: "warning",
        file: UNITS_FILE,
        location,
        message: `unit "${u.code}" is listed on scene "${u.scene}" but drawn on ${[...scenes].map((s) => `"${s}"`).join(", ")}`,
      });
    }
  }
  return findings;
}

/** Child scenes that no hotspot of their parent opens cannot be reached by visitors. Warning only. */
export function scenesAreReachable(tree: SceneTree): Finding[] {
  const findings: Finding[] = [];
  for (const scene of tree.scenes) {
    const targets = new Set(scene.hotspots.flatMap((h) => ("scene" in h.target ? [h.target.scene] : [])));
    for (const child of scene.children) {
      if (!targets.has(child.id)) {
        findings.push({
          severity: "warning",
          file: CONFIG_FILE,
          location: `scene "${child.id}"`,
          message: `no hotspot on "${scene.id}" opens this scene, so visitors cannot reach it`,
        });
      }
    }
  }
  return findings;
}

/** Every file the config and sheet refer to, with where it was referenced. */
export function referencedFiles(config: ProjectConfig, tree: SceneTree, units: readonly UnitRow[]) {
  return [
    { path: config.project.branding.logo, file: CONFIG_FILE, location: "project.branding.logo" },
    ...tree.scenes.map((s) => ({ path: s.image.path, file: CONFIG_FILE, location: `scene "${s.id}", image.path` })),
    ...units.flatMap((u) =>
      u.planImage ? [{ path: u.planImage, file: UNITS_FILE, location: `row ${u.sheetRow}, plan_image` }] : [],
    ),
  ];
}
