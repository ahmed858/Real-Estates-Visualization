// Floating notice while the guided tour runs, with the button that stops it.
import { globeText } from "../globe/globe-text";
import type { ViewerLocale } from "../layout/viewer-text";

export interface TourBarProps {
  locale: ViewerLocale;
  onStop: () => void;
}

export function TourBar({ locale, onStop }: TourBarProps) {
  const text = globeText(locale).tour;
  return (
    <div className="absolute inset-x-0 bottom-3 z-40 flex justify-center" data-testid="tour-bar">
      <div className="flex items-center gap-3 rounded-full bg-zinc-950/80 py-1.5 ps-4 pe-1.5 text-sm text-white ring-1 ring-white/15 backdrop-blur-md">
        <span className="flex items-center gap-2">
          <span className="size-2 animate-pulse rounded-full bg-[var(--brand-accent,#c9a46a)] motion-reduce:animate-none" aria-hidden="true" />
          {text.running}
        </span>
        <button type="button" onClick={onStop} className="rounded-full bg-white/15 px-3 py-1 font-medium hover:bg-white/25">
          {text.stop}
        </button>
      </div>
    </div>
  );
}
