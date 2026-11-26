// Small note shown when unit statuses come from the last good copy of the
// sheet because the latest read failed. Visitors see only the note; the
// problems themselves are logged on the server for the owner.
import type { ViewerText } from "../layout/viewer-text";

export interface StaleDataNoteProps {
  text: Pick<ViewerText, "staleNote">;
}

export function StaleDataNote({ text }: StaleDataNoteProps) {
  return (
    <p role="status" data-stale-note className="flex items-center gap-2 rounded-md border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-sm text-amber-100">
      <span aria-hidden="true">⚠</span>
      {text.staleNote}
    </p>
  );
}
