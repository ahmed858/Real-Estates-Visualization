"use client";
// "Download project.json": enabled only when the live checks find no errors
// (warnings are fine). The file is built in the browser; nothing is written
// to the server. The owner replaces projects/<slug>/project.json and commits.
import type { ProjectConfig } from "@/modules/schema";
import { PROJECT_JSON_FILE, serializeProjectConfig } from "./serialize-project";

export interface DownloadButtonProps {
  config: ProjectConfig;
  errorCount: number;
}

export function DownloadButton({ config, errorCount }: DownloadButtonProps) {
  const blocked = errorCount > 0;
  const download = () => {
    const url = URL.createObjectURL(new Blob([serializeProjectConfig(config)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = PROJECT_JSON_FILE;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="flex flex-col gap-1 text-sm">
      <button
        type="button"
        className="rounded border border-white/20 px-3 py-1 hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent"
        onClick={download}
        disabled={blocked}
        aria-describedby="download-note"
      >
        Download project.json
      </button>
      <p id="download-note" className="text-xs text-zinc-400">
        {blocked ? "Fix the errors above to download." : "Replace the project's project.json with it and commit."}
      </p>
    </div>
  );
}
