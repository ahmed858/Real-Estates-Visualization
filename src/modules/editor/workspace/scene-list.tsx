"use client";
// The project's scenes as an indented list (parents before children); the
// selected scene is marked with aria-current.
export interface EditorSceneItem {
  id: string;
  title: string;
  /** 0 for the root scene. */
  depth: number;
  href: string;
  hotspotCount: number;
}

export interface SceneListProps {
  scenes: readonly EditorSceneItem[];
  selectedId: string;
  /** When set, a plain click opens the scene in the page instead of loading its link. */
  onSelect?: (id: string) => void;
}

export function SceneList({ scenes, selectedId, onSelect }: SceneListProps) {
  return (
    <nav aria-label="Scenes">
      <ul className="flex flex-col gap-0.5 text-sm">
        {scenes.map((s) => (
          <li key={s.id} style={{ paddingInlineStart: `${s.depth * 1}rem` }}>
            <a
              href={s.href}
              onClick={(e) => {
                // Modified clicks (new tab, new window) keep the browser's behaviour.
                if (!onSelect || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                e.preventDefault();
                onSelect(s.id);
              }}
              aria-current={s.id === selectedId ? "page" : undefined}
              className="flex justify-between gap-2 rounded px-2 py-1 hover:bg-white/10 aria-[current=page]:bg-white/15 aria-[current=page]:font-semibold"
            >
              <span>{s.title}</span>
              <span className="text-zinc-400">
                {s.id} · {s.hotspotCount}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
