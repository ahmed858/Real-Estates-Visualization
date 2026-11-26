// Page frame of the viewer: header on top, the scene in the main area, a side
// panel on the inline-end side and the status legend under the scene. Each
// area is a slot, so later units replace one piece without touching the rest.
import type { CSSProperties, ReactNode } from "react";
import type { ViewerLocale } from "./viewer-text";
import { viewerText } from "./viewer-text";

export interface ViewerLayoutProps {
  locale: ViewerLocale;
  /** Project brand colours, exposed to children as --brand-primary / --brand-accent. */
  brand: { primary: string; accent: string };
  header: ReactNode;
  scene: ReactNode;
  legend: ReactNode;
  panel: ReactNode;
}

export function ViewerLayout({ locale, brand, header, scene, legend, panel }: ViewerLayoutProps) {
  const style = { "--brand-primary": brand.primary, "--brand-accent": brand.accent } as CSSProperties;
  return (
    <div lang={locale} dir={viewerText(locale).dir} style={style} className="flex min-h-screen flex-1 flex-col">
      {header}
      <div className="flex flex-1 flex-row gap-6 p-6">
        <main className="flex min-w-0 flex-1 flex-col gap-4">
          {scene}
          {legend}
        </main>
        <aside className="w-80 shrink-0" data-testid="viewer-panel">
          {panel}
        </aside>
      </div>
    </div>
  );
}
