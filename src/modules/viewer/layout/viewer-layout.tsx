// Page frame of the viewer on a dark page: the scene fills the stage edge to
// edge, the header and navigation sit over its top on a translucent bar, the
// status legend floats at its bottom and the side panel is on the inline-end
// side. Below 768px (phone frame) the top bar sticks above the scene instead
// of covering it, the scene is at most 60% of the screen tall, the legend
// follows the scene and the side panel becomes a bottom sheet. Each area is a slot, so later units replace one piece without
// touching the rest.
import type { ReactNode } from "react";
import { brandStyle, type BrandColors } from "./brand-style";
import type { ViewerLocale } from "./viewer-text";
import { viewerText } from "./viewer-text";

export interface ViewerLayoutProps {
  locale: ViewerLocale;
  /** Project brand colours, exposed to children as CSS variables (see `brandStyle`). */
  brand: BrandColors;
  header: ReactNode;
  /** Navigation above the scene, e.g. breadcrumbs. */
  nav?: ReactNode;
  scene: ReactNode;
  legend: ReactNode;
  panel: ReactNode;
}

/** Below this width (Tailwind `md`, 768px) the viewer uses the phone frame. */
export const MOBILE_BREAKPOINT_PX = 768;

export function ViewerLayout({ locale, brand, header, nav, scene, legend, panel }: ViewerLayoutProps) {
  const style = brandStyle(brand);
  return (
    <div
      lang={locale}
      dir={viewerText(locale).dir}
      style={style}
      className="flex min-h-screen flex-1 flex-col overflow-x-hidden bg-zinc-950 text-zinc-100 [--stage-height:60dvh] md:flex-row md:[--stage-height:100dvh]"
    >
      <main className="relative flex min-w-0 flex-1 flex-col md:min-h-[100dvh] md:items-center md:justify-center md:overflow-hidden" data-testid="viewer-stage">
        <div className="sticky top-0 z-20 bg-zinc-950/80 backdrop-blur-md md:absolute md:inset-x-0 md:bg-zinc-950/55" data-testid="viewer-topbar">
          {header}
          {nav && <div className="px-4 pb-2 md:px-6 md:pb-3">{nav}</div>}
        </div>
        {scene}
        <div className="z-20 mx-4 my-3 self-start rounded-2xl bg-zinc-950/65 px-4 py-2 backdrop-blur-md md:absolute md:bottom-4 md:start-4 md:m-0 md:rounded-full">{legend}</div>
      </main>
      <aside
        className="sticky bottom-0 z-30 max-h-[45dvh] w-full shrink-0 overflow-y-auto rounded-t-2xl border-t border-white/10 bg-zinc-900 p-4 shadow-[0_-8px_24px_rgba(0,0,0,0.5)] md:static md:h-[100dvh] md:max-h-none md:w-80 md:rounded-none md:border-s md:border-t-0 md:shadow-none"
        data-testid="viewer-panel"
      >
        {panel}
      </aside>
    </div>
  );
}
