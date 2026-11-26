// Unit status: one enum, many spellings (English and Arabic) accepted from the sheet.
export const UNIT_STATUSES = ["available", "reserved", "sold"] as const;
export type UnitStatus = (typeof UNIT_STATUSES)[number];

const SPELLINGS: Record<UnitStatus, string[]> = {
  available: ["available", "متاح", "متاحة", "متاحه"],
  reserved: ["reserved", "محجوز", "محجوزة", "محجوزه"],
  sold: ["sold", "مباع", "مباعة", "مباعه", "تم البيع"],
};

/** Lowercases, collapses spaces and removes Arabic diacritics and tatweel. */
function normaliseSpelling(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[ً-ْـ]/g, "")
    .replace(/\s+/g, " ");
}

const LOOKUP = new Map<string, UnitStatus>(
  UNIT_STATUSES.flatMap((status) => SPELLINGS[status].map((s) => [normaliseSpelling(s), status] as const)),
);

/** Accepted spellings, for error messages and the collection guide. */
export const STATUS_SPELLINGS: Readonly<Record<UnitStatus, readonly string[]>> = SPELLINGS;

/** Returns the status for a sheet value, or null if the spelling is not known. */
export function normaliseStatus(value: unknown): UnitStatus | null {
  if (typeof value !== "string") return null;
  return LOOKUP.get(normaliseSpelling(value)) ?? null;
}
