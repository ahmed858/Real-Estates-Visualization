"use client";
// Shares the selected unit's link: the system share sheet where the browser
// has one (phones), otherwise copies the link and says so.
import { useState } from "react";
import type { ViewerText } from "../layout/viewer-text";
import { unitShareUrl } from "./share-link";

export interface ShareTarget {
  share?: (data: { title: string; url: string }) => Promise<void>;
  copy?: (text: string) => Promise<void>;
}

export interface ShareButtonProps {
  code: string;
  /** The concrete floor on a typical floor scene; the page URL already has it when the visitor picked one. */
  floor?: number;
  title: string;
  text: ViewerText;
  /** Defaults to the browser's navigator.share / clipboard; tests pass fakes. */
  target?: ShareTarget;
}

function browserTarget(): ShareTarget {
  if (typeof navigator === "undefined") return {};
  return {
    ...(typeof navigator.share === "function" && { share: (data) => navigator.share(data) }),
    ...(navigator.clipboard && { copy: (t) => navigator.clipboard.writeText(t) }),
  };
}

export function ShareButton({ code, floor, title, text, target }: ShareButtonProps) {
  const [note, setNote] = useState<string | undefined>();
  async function onClick() {
    const { share, copy } = target ?? browserTarget();
    const url = unitShareUrl(window.location.href, code, floor);
    if (share) {
      try {
        await share({ title, url });
        return;
      } catch (e) {
        // The visitor closed the share sheet: nothing to do.
        if ((e as Error)?.name === "AbortError") return;
      }
    }
    if (!copy) return setNote(url);
    try {
      await copy(url);
      setNote(text.share.copied);
    } catch {
      setNote(url);
    }
  }
  return (
    <div className="flex max-w-40 flex-col items-end gap-1">
      <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-zinc-300 hover:bg-white/10 hover:text-white">
        <svg aria-hidden="true" viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
        </svg>
        {text.share.button}
      </button>
      <p role="status" className="break-all text-end text-xs text-zinc-400">
        {note}
      </p>
    </div>
  );
}
