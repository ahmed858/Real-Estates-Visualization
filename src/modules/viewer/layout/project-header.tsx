// Viewer header: project logo and name, plus actions. It sits on the
// translucent top bar of the stage, with a thin brand accent line.
import type { ReactNode } from "react";
import type { ViewerText } from "./viewer-text";

export interface ProjectHeaderProps {
  name: string;
  logoUrl: string;
  text: ViewerText;
  /** Controls at the inline end of the header, e.g. the language switch. */
  actions?: ReactNode;
}

export function ProjectHeader({ name, logoUrl, text, actions }: ProjectHeaderProps) {
  return (
    <header className="flex items-center gap-2 border-b border-[var(--brand-accent)]/40 px-4 py-2 text-white md:gap-3 md:px-6 md:py-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoUrl} alt={text.logoAlt(name)} width={40} height={40} className="h-8 w-8 shrink-0 rounded-md md:h-10 md:w-10" />
      <h1 className="min-w-0 truncate text-base font-semibold md:text-xl">{name}</h1>
      {actions && <div className="ms-auto flex shrink-0 items-center gap-1 md:gap-2">{actions}</div>}
    </header>
  );
}
