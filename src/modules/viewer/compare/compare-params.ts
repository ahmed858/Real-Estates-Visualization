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
