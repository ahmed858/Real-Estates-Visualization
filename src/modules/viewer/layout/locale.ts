// Which language the viewer shows: ?lang=ar|en in the URL, else the
// project's default. Kept in the URL so a shared link opens in its language.
import { LOCALES } from "@/modules/schema";
import type { ViewerLocale } from "./viewer-text";

export const LANG_PARAM = "lang";

const isLocale = (value: unknown): value is ViewerLocale => (LOCALES as readonly unknown[]).includes(value);

/** The locale from a `lang` query value (string, repeated array or missing), falling back to the project default. */
export function resolveLocale(raw: string | string[] | null | undefined, fallback: ViewerLocale): ViewerLocale {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return isLocale(value) ? value : fallback;
}

/** Adds `lang` to an app-relative href, or leaves it out when the locale is the project default. */
export function withLocale(href: string, locale: ViewerLocale, defaultLocale: ViewerLocale): string {
  const url = new URL(href, "http://x");
  if (locale === defaultLocale) url.searchParams.delete(LANG_PARAM);
  else url.searchParams.set(LANG_PARAM, locale);
  return url.pathname + url.search + url.hash;
}

/** The other supported locale (the viewer has exactly two). */
export const otherLocale = (locale: ViewerLocale): ViewerLocale => (locale === "ar" ? "en" : "ar");
