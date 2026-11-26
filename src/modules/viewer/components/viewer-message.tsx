// A centred message for viewer states with no scene to show (project not found, invalid data).
export interface ViewerMessageProps {
  title: string;
  /** Optional details, one per line (e.g. validation problems). */
  details?: readonly string[];
}

export function ViewerMessage({ title, details = [] }: ViewerMessageProps) {
  return (
    <section role="status" className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {details.length > 0 && (
        <ul className="max-w-xl list-none text-sm text-zinc-600 dark:text-zinc-400">
          {details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
