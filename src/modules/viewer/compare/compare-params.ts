// The compare page reads its units from the URL only (?units=A,B,C), so a
// compare link can be shared. A plain module so server pages can use it.
export const COMPARE_PARAM = "units";
export const MAX_COMPARED = 3;

/**
 * The codes to compare, in the order given: unknown and repeated codes are
 * skipped and at most MAX_COMPARED are kept. A repeated parameter
 * (?units=A&units=B) counts like a comma-separated one.
 */
export function parseCompareCodes(value: string | readonly string[] | undefined, known: ReadonlySet<string>): string[] {
  const raw = (typeof value === "string" ? [value] : (value ?? [])).flatMap((v) => v.split(","));
  const codes: string[] = [];
  for (const part of raw) {
    const code = part.trim();
    if (!known.has(code) || codes.includes(code)) continue;
    codes.push(code);
    if (codes.length === MAX_COMPARED) break;
  }
  return codes;
}

/** The units page remembers picked codes in ?compare=A,B, so Back and sharing keep them. */
export const PICK_PARAM = "compare";

/** Adds the code, or removes it when already picked; adding past MAX_COMPARED does nothing. */
export function togglePicked(picked: readonly string[], code: string): string[] {
  if (picked.includes(code)) return picked.filter((c) => c !== code);
  return picked.length < MAX_COMPARED ? [...picked, code] : [...picked];
}

/** `base` (a path, maybe with ?lang=) with `param` set to the comma-separated codes. */
export function withCodes(base: string, param: string, codes: readonly string[]): string {
  const url = new URL(base, "http://local");
  url.searchParams.set(param, codes.join(","));
  return `${url.pathname}${url.search.replace(/%2C/g, ",")}`;
}
