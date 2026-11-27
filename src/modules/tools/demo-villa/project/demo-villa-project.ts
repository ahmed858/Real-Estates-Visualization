// The whole demo-villa project as an in-memory file map; writing it is a separate step.
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { buildXlsx } from "../../xlsx/write-xlsx";
import { renderFacadeSvg } from "../facade/facade-svg";
import { buildVillaGeometry } from "../geometry/villa-geometry";
import { renderFloorPlanSvg } from "../svg/floor-plan-svg";
import { el, svgDocument, text } from "../svg/svg";
import { renderTurntableFrameSvg } from "../turntable/turntable-svg";
import { TURNTABLE_FRAMES } from "../turntable/turntable-camera";
import { buildDemoVillaConfig, facadeImagePath, floorImagePath, LOGO_PATH, turntableFramePath, turntablePosterPath } from "./project-config";
import { demoVillaUnitRows } from "./units";

/** Project-relative path → file content. */
export type ProjectFiles = Map<string, string | Buffer>;

function logoSvg(): string {
  return svgDocument(
    256,
    256,
    [
      el("rect", { x: 0, y: 0, width: 256, height: 256, rx: 40, fill: "#1a6b4f" }),
      el("polygon", { points: "48,120 128,56 208,120", fill: "#c89b3c" }),
      el("rect", { x: 72, y: 120, width: 112, height: 80, fill: "#ffffff" }),
      text("CV", { x: 128, y: 178, "text-anchor": "middle", "font-family": "Helvetica, Arial, sans-serif", "font-size": 44, "font-weight": 700, fill: "#1a6b4f" }),
    ],
    "Courtyard Villa",
  );
}

export function buildDemoVillaProject(): ProjectFiles {
  const villa = buildVillaGeometry();
  const files: ProjectFiles = new Map();
  files.set("project.json", `${JSON.stringify(buildDemoVillaConfig(villa), null, 2)}\n`);
  files.set("units.xlsx", buildXlsx(demoVillaUnitRows(villa), "Units"));
  files.set(facadeImagePath, renderFacadeSvg(villa));
  for (const floor of villa.floors) files.set(floorImagePath(floor.id), renderFloorPlanSvg(villa, floor.id));
  files.set(LOGO_PATH, logoSvg());
  for (let frame = 1; frame <= TURNTABLE_FRAMES; frame++) files.set(turntableFramePath(frame), renderTurntableFrameSvg(villa, frame));
  files.set(turntablePosterPath, renderTurntableFrameSvg(villa, 1));
  return files;
}

/** Writes the files under `dir`, creating folders as needed. Other files in `dir` are left alone. */
export async function writeProjectFiles(dir: string, files: ProjectFiles): Promise<void> {
  for (const [path, content] of files) {
    const target = join(dir, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content);
  }
}
