// Legend for the unit status styles, optionally with a count per status.
// Each entry has a text label and a swatch drawn with the same fill, outline
// and pattern as the hotspots, so it does not rely on colour alone.
import { useId } from "react";
import { UNIT_STATUSES, type UnitStatus } from "@/modules/schema";
import { HatchPattern, STATUS_STYLE } from "../scene/status-style";
import type { ViewerText } from "./viewer-text";

export interface StatusLegendProps {
  text: ViewerText;
  /** Units per status in the current scene (rolled up the tree); omitted hides the counts. */
  counts?: Readonly<Record<UnitStatus, number>>;
}

/** Small square drawn like a hotspot of that status (fill, outline, pattern). */
export function StatusSwatch({ status }: { status: UnitStatus }) {
  const hatchId = `legend-hatch-${useId().replace(/:/g, "")}`;
  const style = STATUS_STYLE[status];
  return (
    <svg width={18} height={18} viewBox="0 0 18 18" aria-hidden="true" data-swatch={status}>
      {style.hatch && (
        <defs>
          <HatchPattern id={hatchId} size={5} />
        </defs>
      )}
      <rect x={1} y={1} width={16} height={16} rx={2} fill={style.color} fillOpacity={0.45} stroke={style.color} strokeWidth={2} strokeDasharray={style.dash ? "4 2" : undefined} />
      {style.hatch && <rect x={1} y={1} width={16} height={16} rx={2} fill={`url(#${hatchId})`} />}
    </svg>
  );
}

export function StatusLegend({ text, counts }: StatusLegendProps) {
  return (
    <section aria-label={text.statusLegend}>
      <ul className="flex flex-wrap gap-4 text-sm">
        {UNIT_STATUSES.map((status) => (
          <li key={status} data-status={status} className="flex items-center gap-2">
            <StatusSwatch status={status} />
            <span>{text.status[status]}</span>
            {counts && (
              <span data-count={status} className="rounded-full bg-white/10 px-2 font-semibold tabular-nums text-zinc-100">
                {counts[status]}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
