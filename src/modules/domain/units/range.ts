// Inclusive numeric range helpers.

export interface NumberRange {
  min: number;
  max: number;
}

/** Widens a range to include a value (or starts one). */
export function extend(range: NumberRange | null, value: number): NumberRange {
  return range ? { min: Math.min(range.min, value), max: Math.max(range.max, value) } : { min: value, max: value };
}

/** Merges two ranges; null means "no values". */
export function merge(a: NumberRange | null, b: NumberRange | null): NumberRange | null {
  if (!a) return b;
  if (!b) return a;
  return { min: Math.min(a.min, b.min), max: Math.max(a.max, b.max) };
}
