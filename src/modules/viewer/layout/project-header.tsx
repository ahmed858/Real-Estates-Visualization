// Viewer header: project logo and name in the brand colour.
import type { ViewerText } from "./viewer-text";

export interface ProjectHeaderProps {
  name: string;
  logoUrl: string;
  text: ViewerText;
}

export function ProjectHeader({ name, logoUrl, text }: ProjectHeaderProps) {
  return (
    <header className="flex items-center gap-3 border-b-4 border-[var(--brand-accent)] bg-[var(--brand-primary)] px-6 py-3 text-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoUrl} alt={text.logoAlt(name)} width={40} height={40} className="h-10 w-10 rounded-md" />
      <h1 className="text-xl font-semibold">{name}</h1>
    </header>
  );
}
