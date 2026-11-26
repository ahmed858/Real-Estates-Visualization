// Minimal SVG string builder: elements with escaped attributes and text, stable output.
export type Attrs = Record<string, string | number | undefined>;

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Formats a number with at most 2 decimals, so output is stable and compact. */
export const num = (n: number): string => String(Math.round(n * 100) / 100);

function attrs(a: Attrs): string {
  return Object.entries(a)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => ` ${k}="${escape(typeof v === "number" ? num(v) : String(v))}"`)
    .join("");
}

/** An element; children are already-rendered strings. Empty elements self-close. */
export function el(tag: string, a: Attrs = {}, children: readonly string[] = []): string {
  if (children.length === 0) return `<${tag}${attrs(a)}/>`;
  return `<${tag}${attrs(a)}>${children.join("")}</${tag}>`;
}

export function text(content: string, a: Attrs): string {
  return `<text${attrs(a)}>${escape(content)}</text>`;
}

export function points(list: readonly (readonly [number, number])[]): string {
  return list.map(([x, y]) => `${num(x)},${num(y)}`).join(" ");
}

/** A complete SVG document, one element per line for readable diffs. */
export function svgDocument(width: number, height: number, body: readonly string[], title: string): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${num(width)}" height="${num(height)}" viewBox="0 0 ${num(width)} ${num(height)}">`,
    `<title>${escape(title)}</title>`,
    ...body,
    "</svg>",
    "",
  ].join("\n");
}
