// Cell parsers for the units sheet. A spreadsheet cell can arrive as a number,
// a string (possibly with Arabic-Indic digits or thousands separators) or empty.
import { z } from "zod";

const ARABIC_INDIC_ZERO = 0x0660;
const EXTENDED_ARABIC_INDIC_ZERO = 0x06f0;

/** Converts Arabic-Indic and Persian digits to ASCII digits. */
export function toAsciiDigits(text: string): string {
  return text.replace(/[٠-٩۰-۹]/g, (d) => {
    const code = d.charCodeAt(0);
    const base = code >= EXTENDED_ARABIC_INDIC_ZERO ? EXTENDED_ARABIC_INDIC_ZERO : ARABIC_INDIC_ZERO;
    return String(code - base);
  });
}

/** True when a cell holds nothing (undefined, null or whitespace only). */
export function isBlank(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
}

function toNumber(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const cleaned = toAsciiDigits(value.trim())
    .replace(/[٬,\s]/g, "") // Arabic thousands separator, commas, spaces
    .replace(/٫/g, "."); // Arabic decimal separator
  if (cleaned === "" || !/^-?\d+(\.\d+)?$/.test(cleaned)) return value;
  return Number(cleaned);
}

function toText(value: unknown): unknown {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return typeof value === "string" ? value.trim() : value;
}

export const textCell = z.preprocess(toText, z.string({ error: "must be text" }).min(1, "is required"));

export const integerCell = z.preprocess(toNumber, z.number({ error: "must be a whole number" }).int("must be a whole number"));

export const countCell = z.preprocess(
  toNumber,
  z.number({ error: "must be a whole number" }).int("must be a whole number").min(0, "must not be negative"),
);

export const positiveNumberCell = z.preprocess(
  toNumber,
  z.number({ error: "must be a number" }).positive("must be greater than 0"),
);

export const nonNegativeNumberCell = z.preprocess(
  toNumber,
  z.number({ error: "must be a number" }).min(0, "must not be negative"),
);

export const sceneIdCell = z.preprocess(
  toText,
  z
    .string({ error: "must be text" })
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "must be a scene id: lowercase letters, digits and single dashes"),
);

export const filePathCell = z.preprocess(
  toText,
  z
    .string({ error: "must be text" })
    .refine((p) => !p.startsWith("/") && !/^[a-zA-Z]:/.test(p), "must be relative to the project folder")
    .refine((p) => !p.split(/[\\/]/).includes(".."), 'must not contain ".." segments'),
);

/** Splits a gallery cell ("a.jpg; b.jpg") into its non-empty paths. */
export const galleryPaths = (cell: string): string[] => cell.split(";").map((p) => p.trim()).filter((p) => p !== "");

/** Image paths separated by ";", each relative to the project folder; normalised to "a;b". */
export const galleryCell = z.preprocess(
  toText,
  z
    .string({ error: "must be text" })
    .transform(galleryPaths)
    .refine((paths) => paths.length > 0, "must list at least one image path")
    .refine((paths) => paths.every((p) => !p.startsWith("/") && !/^[a-zA-Z]:/.test(p)), "every path must be relative to the project folder")
    .refine((paths) => paths.every((p) => !p.split(/[\\/]/).includes("..")), 'no path may contain ".." segments')
    .transform((paths) => paths.join(";")),
);

