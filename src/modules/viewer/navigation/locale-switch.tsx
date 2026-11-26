"use client";
// Header button that switches between Arabic and English. It keeps the
// current scene and every other query parameter (?unit=, ?floor=).
import { useRouter } from "next/navigation";
import { otherLocale, withLocale } from "../layout/locale";
import type { ViewerLocale } from "../layout/viewer-text";

/** Each language's name in its own language, as language pickers usually show it. */
const LANGUAGE_NAME: Record<ViewerLocale, string> = { ar: "العربية", en: "English" };

export interface LocaleSwitchProps {
  locale: ViewerLocale;
  defaultLocale: ViewerLocale;
}

export function LocaleSwitch({ locale, defaultLocale }: LocaleSwitchProps) {
  const router = useRouter();
  const next = otherLocale(locale);
  return (
    <button
      type="button"
      lang={next}
      onClick={() => {
        const { pathname, search, hash } = window.location;
        router.push(withLocale(pathname + search + hash, next, defaultLocale));
      }}
      className="rounded-md border border-white/60 px-3 py-1 text-sm font-medium text-white hover:bg-white/10"
    >
      {LANGUAGE_NAME[next]}
    </button>
  );
}
