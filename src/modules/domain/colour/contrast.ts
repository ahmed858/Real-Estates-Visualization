// Colour maths for readable brand colours. Pure functions, no I/O.
// Contrast follows WCAG 2.x (relative luminance, contrast ratio); colour
// difference is CIE76 (Euclidean distance in CIELAB), enough to tell when two
// colours look alike.

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Parses "#rrggbb" or "#rgb" (case-insensitive); throws on anything else. */
export function parseHexColor(hex: string): Rgb {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`not a hex colour: "${hex}"`);
  const digits = m[1].length === 3 ? [...m[1]].map((d) => d + d).join("") : m[1];
  return {
    r: parseInt(digits.slice(0, 2), 16),
    g: parseInt(digits.slice(2, 4), 16),
    b: parseInt(digits.slice(4, 6), 16),
  };
}

/** sRGB channel (0..255) to linear light (0..1). */
function linear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHexColor(hex);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** WCAG contrast ratio between two colours, 1 to 21, order does not matter. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export const BLACK = "#000000";
export const WHITE = "#ffffff";

/** Black or white, whichever reads better on the given background. */
export function readableTextColor(background: string): typeof BLACK | typeof WHITE {
  return contrastRatio(background, BLACK) >= contrastRatio(background, WHITE) ? BLACK : WHITE;
}

function toLab(hex: string): [number, number, number] {
  const { r, g, b } = parseHexColor(hex);
  const [lr, lg, lb] = [linear(r), linear(g), linear(b)];
  // sRGB (D65) to XYZ, normalised by the D65 white point.
  const x = (0.4124 * lr + 0.3576 * lg + 0.1805 * lb) / 0.95047;
  const y = 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
  const z = (0.0193 * lr + 0.1192 * lg + 0.9505 * lb) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** CIE76 colour difference (ΔE). Around 2 is barely visible; under about 20 two colours read as the same hue. */
export function colorDifference(a: string, b: string): number {
  const [l1, a1, b1] = toLab(a);
  const [l2, a2, b2] = toLab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}
