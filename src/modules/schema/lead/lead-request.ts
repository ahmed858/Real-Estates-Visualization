// A visitor's "Ask about this unit" request, as sent by the lead form, and the
// JSON document forwarded to the client's webhook (see docs/leads.md).
import { z } from "zod";
import { formatPath, type ParseResult } from "../project/parse-project-config";
import { localeSchema, LOCALES } from "../project/primitives";

/** Hidden form field that people never fill in; a value means a bot sent the form. */
export const LEAD_HONEYPOT_FIELD = "website";

export const LEAD_NAME_MAX = 100;
export const LEAD_MESSAGE_MAX = 1000;
const UNIT_CODE_MAX = 50;

/** Arabic-Indic (٠-٩) and Eastern Arabic-Indic (۰-۹) digits become 0-9. */
export function toAsciiDigits(text: string): string {
  return text.replace(/[٠-٩۰-۹]/g, (d) => String(d.charCodeAt(0) & 0xf));
}

/**
 * A phone number as visitors type it: digits with optional +, spaces, dashes,
 * dots and brackets, 7 to 15 digits. Kept as typed (digits made ASCII), since
 * the client calls the visitor back and local formats differ.
 */
const phoneSchema = z
  .string()
  .transform((p) => toAsciiDigits(p).trim())
  .refine((p) => /^\+?[\d\s().-]+$/.test(p), "must contain only digits, spaces and + - ( ) .")
  .refine((p) => {
    const digits = p.replace(/\D/g, "").length;
    return digits >= 7 && digits <= 15;
  }, "must have 7 to 15 digits");

const leadRequestSchema = z.object({
  unitCode: z.string().trim().min(1, "unit code is required").max(UNIT_CODE_MAX, `must be at most ${UNIT_CODE_MAX} characters`),
  name: z.string().trim().min(1, "name is required").max(LEAD_NAME_MAX, `must be at most ${LEAD_NAME_MAX} characters`),
  phone: phoneSchema,
  message: z
    .string()
    .trim()
    .max(LEAD_MESSAGE_MAX, `must be at most ${LEAD_MESSAGE_MAX} characters`)
    .optional()
    .transform((m) => (m === "" ? undefined : m)),
  locale: localeSchema.optional(),
});

/** A validated lead request. */
export interface LeadRequest {
  unitCode: string;
  name: string;
  phone: string;
  message?: string;
  locale?: (typeof LOCALES)[number];
}

/** True when the honeypot field holds anything but whitespace. */
export function isLeadBot(input: unknown): boolean {
  if (typeof input !== "object" || input === null) return false;
  const value = (input as Record<string, unknown>)[LEAD_HONEYPOT_FIELD];
  return value !== undefined && value !== null && String(value).trim() !== "";
}

/** Validates the form body. Unknown fields (including the honeypot) are ignored. Never throws. */
export function parseLeadRequest(input: unknown): ParseResult<LeadRequest> {
  const result = leadRequestSchema.safeParse(input);
  if (!result.success) {
    return { ok: false, errors: result.error.issues.map((i) => ({ path: formatPath(i.path), message: i.message })) };
  }
  const { message, locale, ...rest } = result.data;
  return {
    ok: true,
    value: { ...rest, ...(message !== undefined && { message }), ...(locale !== undefined && { locale }) },
  };
}

export const LEAD_PAYLOAD_TYPE = "unit-enquiry";
export const LEAD_PAYLOAD_VERSION = 1;

/** The JSON document POSTed to a project's webhook. Documented in docs/leads.md; change both together. */
export interface LeadPayload {
  type: typeof LEAD_PAYLOAD_TYPE;
  version: typeof LEAD_PAYLOAD_VERSION;
  /** ISO 8601 time the server received the request, UTC. */
  receivedAt: string;
  project: { slug: string; name: string };
  unit: { code: string; scene: string; floor: number; type: string; status: string; price: number };
  contact: { name: string; phone: string; message: string | null };
  /** Language the visitor used the site in. */
  locale: (typeof LOCALES)[number];
}
