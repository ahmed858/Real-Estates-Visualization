// Where a project's unit rows come from. Optional in project.json; when it is
// missing the project uses its local units.xlsx, so existing projects keep working.
import { z } from "zod";

/** How long the site reuses rows read from a live source before reading it again. */
export const DEFAULT_REFRESH_SECONDS = 60;
export const MIN_REFRESH_SECONDS = 10;
export const MAX_REFRESH_SECONDS = 3600;

export const UNITS_SOURCE_KINDS = ["xlsx", "google-sheet"] as const;

/** The local units.xlsx in the project folder (today's default). */
const xlsxUnitsSourceSchema = z.object({ source: z.literal("xlsx") }).strict();

/** A Google Sheet, addressed by the id in its URL and the tab's gid. */
const googleSheetUnitsSourceSchema = z
  .object({
    source: z.literal("google-sheet"),
    sheetId: z
      .string()
      .regex(/^[A-Za-z0-9_-]{20,}$/, "must be the id from the sheet link: docs.google.com/spreadsheets/d/<id>/edit"),
    gid: z
      .string()
      .regex(/^\d+$/, 'must be the tab number from the sheet link (…#gid=<number>), e.g. "0"')
      .default("0"),
    refreshSeconds: z
      .number()
      .int("must be a whole number of seconds")
      .min(MIN_REFRESH_SECONDS, `must be at least ${MIN_REFRESH_SECONDS} seconds`)
      .max(MAX_REFRESH_SECONDS, `must be at most ${MAX_REFRESH_SECONDS} seconds (1 hour)`)
      .default(DEFAULT_REFRESH_SECONDS),
  })
  .strict();

export const unitsSourceSchema = z.discriminatedUnion("source", [xlsxUnitsSourceSchema, googleSheetUnitsSourceSchema]);

/** Used when project.json has no `units` block. */
export const DEFAULT_UNITS_SOURCE: UnitsSource = { source: "xlsx" };

export type UnitsSource = z.infer<typeof unitsSourceSchema>;
export type UnitsSourceKind = (typeof UNITS_SOURCE_KINDS)[number];
