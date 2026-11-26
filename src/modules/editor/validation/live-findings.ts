// The problems `npm run validate` would report for the config being edited,
// computed in the page with the same domain checks. File existence comes from
// the server as the set of project files that exist.
import { checkProjectFit, CONFIG_FILE, createSceneTree, missingFile, referencedFiles, unitsLabel, type Finding } from "@/modules/domain";
import { DEFAULT_UNITS_SOURCE, parseProjectConfig, type ProjectConfig, type Scene, type UnitRow } from "@/modules/schema";

export interface LiveProject {
  config: ProjectConfig;
  /** Rows of the units source; undefined when it could not be read. */
  units?: readonly UnitRow[];
  /** Project-relative paths of files that exist (images, plan images). */
  existingFiles: ReadonlySet<string>;
}

/** The scene and hotspot a config path such as "root.children[1].hotspots[0].target" points into. */
export function locatePath(config: ProjectConfig, path: string): { sceneId?: string; hotspotId?: string } {
  if (!path.startsWith("root")) return {};
  let scene: Scene = config.root;
  let rest = path.slice("root".length);
  for (let m = /^\.children\[(\d+)\]/.exec(rest); m; m = /^\.children\[(\d+)\]/.exec(rest)) {
    const child: Scene | undefined = scene.children[Number(m[1])];
    if (!child) break;
    scene = child;
    rest = rest.slice(m[0].length);
  }
  const hotspot = /^\.hotspots\[(\d+)\]/.exec(rest);
  const hotspotId = hotspot ? scene.hotspots[Number(hotspot[1])]?.id : undefined;
  return { sceneId: scene.id, ...(hotspotId && { hotspotId }) };
}

/** Errors first, then warnings, each in check order. */
export function liveFindings({ config, units, existingFiles }: LiveProject): Finding[] {
  const parsed = parseProjectConfig(config);
  if (!parsed.ok) {
    return parsed.errors.map((e) => ({ severity: "error", file: CONFIG_FILE, location: e.path, message: e.message, ...locatePath(config, e.path) }));
  }
  const tree = createSceneTree(parsed.value);
  const sheet = unitsLabel(parsed.value.units ?? DEFAULT_UNITS_SOURCE);
  const findings = [
    ...checkProjectFit(tree, units, sheet),
    ...referencedFiles(parsed.value, tree, units ?? [], sheet)
      .filter((ref) => !existingFiles.has(ref.path))
      .map(missingFile),
  ];
  return [...findings.filter((f) => f.severity === "error"), ...findings.filter((f) => f.severity !== "error")];
}
