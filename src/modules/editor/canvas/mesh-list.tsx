"use client";
// The meshes of a model-3d scene's model, each with the hotspot it is linked
// to. "Link" creates a hotspot for the mesh (then the target picker sets where
// it leads); "Select" opens an already linked one. Hotspots naming a mesh the
// model does not have are listed too, so a typo is visible.
import type { Hotspot } from "@/modules/schema";

export interface MeshListProps {
  /** Node names from the model; undefined when the model could not be read. */
  meshNames?: readonly string[];
  hotspots: readonly Hotspot[];
  selectedId?: string;
  onSelect: (hotspotId: string) => void;
  onLink: (mesh: string) => void;
}

function targetText({ target }: Hotspot): string {
  if ("scene" in target) return `scene ${target.scene}`;
  if ("unitSuffix" in target) return `unit suffix ${target.unitSuffix}`;
  return target.unit ? `unit ${target.unit}` : "no target yet";
}

export function MeshList({ meshNames, hotspots, selectedId, onSelect, onLink }: MeshListProps) {
  const byMesh = new Map(hotspots.filter((h) => h.mesh).map((h) => [h.mesh!, h]));
  const names = meshNames ?? [];
  const unknown = [...byMesh.keys()].filter((m) => !names.includes(m));
  const button = "rounded border border-white/20 px-2 py-0.5 text-xs hover:bg-white/10";
  return (
    <section aria-label="Model meshes" className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold">Model meshes</h2>
      {meshNames === undefined ? (
        <p className="text-sm text-zinc-400">The model file could not be read, so its meshes are not listed.</p>
      ) : names.length === 0 ? (
        <p className="text-sm text-zinc-400">The model has no named nodes.</p>
      ) : null}
      <ul className="flex flex-col gap-1 text-sm">
        {[...names, ...unknown].map((mesh) => {
          const h = byMesh.get(mesh);
          return (
            <li key={mesh} data-mesh={mesh} aria-current={h && h.id === selectedId ? "true" : undefined} className="flex flex-wrap items-center gap-2">
              <span className="font-mono">{mesh}</span>
              {h ? (
                <>
                  <span className="text-zinc-400">
                    → {h.id} ({targetText(h)})
                  </span>
                  <button type="button" className={button} onClick={() => onSelect(h.id)} aria-label={`Select ${h.id}`}>
                    Select
                  </button>
                </>
              ) : (
                <button type="button" className={button} onClick={() => onLink(mesh)} aria-label={`Link ${mesh}`}>
                  Link
                </button>
              )}
              {h && !names.includes(mesh) && <span className="text-amber-400">not in the model</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
