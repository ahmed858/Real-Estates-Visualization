// Shortcuts to the premium views of the current scene (3D model, 360°
// turntable, 360° panoramas), as a row of chips next to the breadcrumbs.
// The current view, when it is one of them, is marked and not a link.
import Link from "next/link";
import type { SceneRendererType } from "@/modules/schema";
import type { ViewerText } from "../layout/viewer-text";

export interface SceneViewLink {
  id: string;
  title: string;
  href: string;
  type: Exclude<SceneRendererType, "image-2d">;
}

export interface SceneViewsProps {
  views: readonly SceneViewLink[];
  currentId: string;
  text: Pick<ViewerText, "views">;
}

export function SceneViews({ views, currentId, text }: SceneViewsProps) {
  if (views.length === 0) return null;
  const chip = "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm";
  const badge = (type: SceneViewLink["type"]) => (
    <span aria-hidden="true" className="rounded-full bg-[var(--brand-accent)] px-1.5 text-[11px] font-bold leading-4 text-[var(--brand-on-accent)]">
      {text.views.badge[type]}
    </span>
  );
  return (
    <nav aria-label={text.views.label}>
      <ul className="flex flex-wrap items-center gap-2">
        {views.map((v) => (
          <li key={v.id}>
            {v.id === currentId ? (
              <span aria-current="page" className={`${chip} border-white/40 bg-white/15 font-semibold`}>
                {badge(v.type)}
                {v.title}
              </span>
            ) : (
              <Link href={v.href} className={`${chip} border-white/20 bg-zinc-950/40 hover:bg-white/10`}>
                {badge(v.type)}
                {v.title}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
