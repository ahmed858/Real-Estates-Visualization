"use client";
// Full-size view of a unit's photos over the page. Arrow keys move between
// photos (flipped for right-to-left pages), Escape or the close button
// closes, Tab stays inside while open, and focus returns to the thumbnail
// that opened it.
import { useEffect, useRef, type KeyboardEvent } from "react";
import type { ViewerText } from "../layout/viewer-text";

export interface PhotoLightboxProps {
  urls: readonly string[];
  /** Index of the photo shown. */
  index: number;
  /** Alt text of a photo by index. */
  alt: (index: number) => string;
  text: ViewerText;
  onIndex: (index: number) => void;
  onClose: () => void;
}

export function PhotoLightbox({ urls, index, alt, text, onIndex, onClose }: PhotoLightboxProps) {
  const dialog = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);
  const rtl = text.dir === "rtl";
  const step = (delta: number) => onIndex((index + delta + urls.length) % urls.length);

  useEffect(() => {
    opener.current = document.activeElement;
    dialog.current?.querySelector<HTMLElement>("button")?.focus();
    return () => (opener.current as HTMLElement | null)?.focus?.();
  }, []);

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      // Close only the lightbox, not the unit panel behind it.
      e.preventDefault();
      e.stopPropagation();
      onClose();
    } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      // "Next" is to the right on left-to-right pages and to the left on right-to-left ones.
      step((e.key === "ArrowRight") !== rtl ? 1 : -1);
    } else if (e.key === "Tab") {
      const focusable = [...(dialog.current?.querySelectorAll<HTMLElement>("button") ?? [])];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  }

  const button = "rounded-md bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20";
  return (
    <div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-label={alt(index)}
      dir={text.dir}
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/90 p-4"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={urls[index]} alt={alt(index)} className="max-h-[80dvh] max-w-full rounded object-contain" />
      <div className="flex items-center gap-2">
        {urls.length > 1 && (
          <button type="button" onClick={() => step(-1)} className={button}>
            {text.panel.previousPhoto}
          </button>
        )}
        {urls.length > 1 && (
          <button type="button" onClick={() => step(1)} className={button}>
            {text.panel.nextPhoto}
          </button>
        )}
        <button type="button" onClick={onClose} className={button}>
          {text.panel.close}
        </button>
      </div>
    </div>
  );
}
