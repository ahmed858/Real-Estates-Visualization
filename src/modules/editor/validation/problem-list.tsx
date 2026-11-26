"use client";
// The live problem list: a summary line and one row per finding. A finding
// tied to a scene is a button that opens that scene (and selects its hotspot).
import type { Finding } from "@/modules/domain";

export interface ProblemListProps {
  findings: readonly Finding[];
  onOpen: (sceneId: string, hotspotId?: string) => void;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function ProblemList({ findings, onOpen }: ProblemListProps) {
  const errors = findings.filter((f) => f.severity === "error").length;
  const warnings = findings.length - errors;
  return (
    <section aria-label="Problems" className="flex flex-col gap-2 text-sm">
      <h2 className="font-semibold">Problems</h2>
      <p role="status" className={errors > 0 ? "text-amber-400" : "text-zinc-400"}>
        {findings.length === 0 ? "No problems found." : `${plural(errors, "error")}, ${plural(warnings, "warning")}`}
      </p>
      {findings.length > 0 && (
        <ul className="flex flex-col gap-1">
          {findings.map((f, i) => {
            const text = `${f.severity === "error" ? "Error" : "Warning"}: ${f.file}${f.location ? ` (${f.location})` : ""}: ${f.message}`;
            return (
              <li key={i} data-severity={f.severity} className={f.severity === "error" ? "text-amber-300" : "text-zinc-300"}>
                {f.sceneId ? (
                  <button type="button" className="text-start underline-offset-2 hover:underline" onClick={() => onOpen(f.sceneId!, f.hotspotId)}>
                    {text}
                  </button>
                ) : (
                  text
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
