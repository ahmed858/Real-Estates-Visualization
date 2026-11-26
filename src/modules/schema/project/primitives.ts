// Small reusable field shapes shared by the project config schema.
import { z } from "zod";

/** Identifier used for scenes and hotspots: lowercase letters, digits and dashes. */
export const idSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "must be lowercase letters, digits and single dashes (e.g. ground-floor)");

/** Text shown to visitors, in both supported languages. */
export const localizedTextSchema = z
  .object({
    ar: z.string().trim().min(1, "Arabic text is required"),
    en: z.string().trim().min(1, "English text is required"),
  })
  .strict();

export const LOCALES = ["ar", "en"] as const;
export const localeSchema = z.enum(LOCALES);

/** Path of a file inside the project folder, e.g. "images/facade.svg". */
export const projectFilePathSchema = z
  .string()
  .min(1, "path is required")
  .refine((p) => !p.startsWith("/") && !/^[a-zA-Z]:/.test(p), "must be relative to the project folder")
  .refine((p) => !p.split(/[\\/]/).includes(".."), 'must not contain ".." segments');

export const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "must be a 6-digit hex colour such as #1a6b4f");

/** A point in image pixels: [x, y]. */
export const pointSchema = z.tuple([z.number().finite(), z.number().finite()]);
