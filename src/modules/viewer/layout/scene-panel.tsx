// Side panel area. For now it names the current scene and tells the visitor
// what to do; U-308 fills it with unit details and the scene summary.
import type { ViewerText } from "./viewer-text";

export interface ScenePanelProps {
  sceneTitle: string;
  text: ViewerText;
}

export function ScenePanel({ sceneTitle, text }: ScenePanelProps) {
  return (
    <section aria-label={text.details} className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="text-lg font-semibold">{sceneTitle}</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{text.selectHint}</p>
    </section>
  );
}
