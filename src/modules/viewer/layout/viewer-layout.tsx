// Page frame of the viewer on a dark page: the scene fills the stage edge to
// edge, the header and navigation sit over its top on a translucent bar, the
// status legend floats at its bottom and the side panel is on the inline-end
// side. Each area is a slot, so later units replace one piece without
// touching the rest.
import type { CSSProperties, ReactNode } from "react";
import type { ViewerLocale } from "./viewer-text";
import { viewerText } from "./viewer-text";

export interface ViewerLayoutProps {
  locale: ViewerLocale;
  /** Project brand colours, exposed to children as --brand-primary / --brand-accent. */
  brand: { primary: string; accent: string };
  header: ReactNode;
  /** Navigation above the scene, e.g. breadcrumbs. */
  nav?: ReactNode;
  scene: ReactNode;
  legend: ReactNode;
  panel: ReactNode;
}

export function ViewerLayout({ locale, brand, header, nav, scene, legend, panel }: ViewerLayoutProps) {
  const style = { "--brand-primary": brand.primary, "--brand-accent": brand.accent, "--stage-height": "100dvh" } as CSSProperties;
  return (
    <div lang={locale} dir={viewerText(locale).dir} style={style} className="flex min-h-screen flex-1 flex-row bg-zinc-950 text-zinc-100">
      <main className="relative flex min-h-[100dvh] min-w-0 flex-1 items-center justify-center overflow-hidden" data-testid="viewer-stage">
        {scene}
        <div className="absolute inset-x-0 top-0 z-20 bg-zinc-950/55 backdrop-blur-md" data-testid="viewer-topbar">
          {header}
          {nav && <div className="px-6 pb-3">{nav}</div>}
        </div>
        <div className="absolute bottom-4 start-4 z-20 rounded-full bg-zinc-950/65 px-4 py-2 backdrop-blur-md">{legend}</div>
      </main>
      <aside className="h-[100dvh] w-80 shrink-0 overflow-y-auto border-s border-white/10 bg-zinc-900 p-4" data-testid="viewer-panel">
        {panel}
      </aside>
    </div>
  );
}
