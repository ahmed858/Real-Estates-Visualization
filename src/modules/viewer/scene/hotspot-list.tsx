// Buttons for a scene's hotspots under a premium view (3D model, panorama),
// so every unit or linked scene can be reached by keyboard and screen reader
// users, and without the WebGL view at all.
import type { Hotspot } from "@/modules/schema";
import type { SceneRendererProps } from "./scene-renderer";

export interface HotspotListProps extends Pick<SceneRendererProps, "hotspotLabel" | "onSelect" | "onHover"> {
  hotspots: readonly Hotspot[];
  /** Accessible name of the list. */
  label?: string;
}

export function HotspotList({ hotspots, hotspotLabel, onSelect, onHover, label = "Units in this view" }: HotspotListProps) {
  if (hotspots.length === 0) return null;
  return (
    <ul aria-label={label} className="flex flex-wrap gap-2">
      {hotspots.map((h) => (
        <li key={h.id}>
          <button
            type="button"
            data-model-hotspot={h.id}
            className="rounded border border-white/20 px-2 py-1 text-sm hover:bg-white/10 focus-visible:outline focus-visible:outline-2"
            onClick={() => onSelect?.(h)}
            onMouseEnter={() => onHover?.(h)}
            onMouseLeave={() => onHover?.(null)}
            onFocus={() => onHover?.(h)}
            onBlur={() => onHover?.(null)}
          >
            {hotspotLabel(h)}
          </button>
        </li>
      ))}
    </ul>
  );
}
