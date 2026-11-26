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
    <header className="flex items-center gap-3 border-b border-[var(--brand-accent)]/40 px-6 py-3 text-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoUrl} alt={text.logoAlt(name)} width={40} height={40} className="h-10 w-10 rounded-md" />
      <h1 className="text-xl font-semibold">{name}</h1>
      {actions && <div className="ms-auto flex items-center gap-2">{actions}</div>}
    </header>
  );
}
