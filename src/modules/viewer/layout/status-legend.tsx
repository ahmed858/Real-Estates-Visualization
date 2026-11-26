// Legend for the unit status colours. U-306 adds counts and a palette that
// does not rely on colour alone.
import { UNIT_STATUSES } from "@/modules/schema";
import { HOTSPOT_FILL } from "../scene/image-2d-scene";
import type { ViewerText } from "./viewer-text";

export function StatusLegend({ text }: { text: ViewerText }) {
  return (
    <section aria-label={text.statusLegend}>
      <ul className="flex flex-wrap gap-4 text-sm">
        {UNIT_STATUSES.map((status) => (
          <li key={status} data-status={status} className="flex items-center gap-2">
            <span aria-hidden="true" className="inline-block h-3 w-3 rounded-sm" style={{ background: HOTSPOT_FILL[status] }} />
            {text.status[status]}
          </li>
        ))}
      </ul>
    </section>
  );
}
