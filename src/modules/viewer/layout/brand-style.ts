// The project's brand colours as CSS custom properties for the viewer pages:
// --brand-primary / --brand-accent, plus --brand-on-primary / --brand-on-accent,
// the black or white text colour that reads on each of them.
import type { CSSProperties } from "react";
import { readableTextColor } from "@/modules/domain";

export interface BrandColors {
  primary: string;
  accent: string;
}

export function brandStyle(brand: BrandColors): CSSProperties {
  return {
    "--brand-primary": brand.primary,
    "--brand-accent": brand.accent,
    "--brand-on-primary": readableTextColor(brand.primary),
    "--brand-on-accent": readableTextColor(brand.accent),
  } as CSSProperties;
}
