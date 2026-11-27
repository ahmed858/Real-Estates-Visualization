// POST /p/<slug>/lead: checks a visitor's "Ask about this unit" request and
// forwards it to the project's webhook. Plain function with injected
// dependencies; the route file only wires in the real ones.
import { LeadSinkError, type LeadSink, type ProjectSource } from "@/modules/data-sources";
import { isLeadBot, LEAD_PAYLOAD_TYPE, LEAD_PAYLOAD_VERSION, parseLeadRequest, type LeadPayload } from "@/modules/schema";
import { clientIp, type RateLimitResult } from "./lead-rate-limit";
import { projectPageState } from "./project-page-state";

/** Larger bodies are refused before parsing; a real form is well under 4 KB. */
export const LEAD_BODY_MAX_BYTES = 8 * 1024;

export interface LeadHandlerDeps {
  /** Visitor source: hidden projects are not found. */
  projects: ProjectSource;
  /** The project's sink, or undefined when it has no webhook (no form). */
  sinkFor(slug: string): LeadSink | undefined;
  limiter: { hit(key: string): RateLimitResult };
  now(): Date;
  log(message: string): void;
}

/** Answer body: `{ ok: true }` or `{ ok: false, error, fields? }`. */
export type LeadAnswer =
  | { ok: true }
  | { ok: false; error: "not-found" | "unsupported-type" | "too-large" | "bad-json" | "rate-limited" | "invalid" | "unavailable" | "delivery-failed"; fields?: string[] };

const answer = (status: number, body: LeadAnswer, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

async function readJson(request: Request): Promise<{ ok: true; value: unknown } | { ok: false; response: Response }> {
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return { ok: false, response: answer(415, { ok: false, error: "unsupported-type" }) };
  }
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > LEAD_BODY_MAX_BYTES) return { ok: false, response: answer(413, { ok: false, error: "too-large" }) };
  const text = await request.text();
  if (new TextEncoder().encode(text).length > LEAD_BODY_MAX_BYTES) return { ok: false, response: answer(413, { ok: false, error: "too-large" }) };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, response: answer(400, { ok: false, error: "bad-json" }) };
  }
}

export async function handleLeadRequest(slug: string, request: Request, deps: LeadHandlerDeps): Promise<Response> {
  const sink = deps.sinkFor(slug);
  if (sink === undefined) return answer(404, { ok: false, error: "not-found" });

  const body = await readJson(request);
  if (!body.ok) return body.response;

  const limit = deps.limiter.hit(clientIp(request.headers));
  if (!limit.allowed) return answer(429, { ok: false, error: "rate-limited" }, { "Retry-After": String(limit.retryAfterSeconds) });

  // A bot filled the hidden field: answer as if it worked, so it learns nothing.
  if (isLeadBot(body.value)) return answer(200, { ok: true });

  const lead = parseLeadRequest(body.value);
  if (!lead.ok) return answer(400, { ok: false, error: "invalid", fields: [...new Set(lead.errors.map((e) => e.path))] });

  const state = await projectPageState(slug, deps.projects);
  if (state.kind === "not-found") return answer(404, { ok: false, error: "not-found" });
  if (state.kind === "invalid") return answer(503, { ok: false, error: "unavailable" });

  const { config, units } = state.project;
  const unit = units.find((u) => u.code === lead.value.unitCode);
  if (unit === undefined) return answer(400, { ok: false, error: "invalid", fields: ["unitCode"] });

  const payload: LeadPayload = {
    type: LEAD_PAYLOAD_TYPE,
    version: LEAD_PAYLOAD_VERSION,
    receivedAt: deps.now().toISOString(),
    project: { slug, name: config.project.name[config.project.defaultLocale] },
    unit: { code: unit.code, scene: unit.scene, floor: unit.floor, type: unit.type, status: unit.status, price: unit.price },
    contact: { name: lead.value.name, phone: lead.value.phone, message: lead.value.message ?? null },
    locale: lead.value.locale ?? config.project.defaultLocale,
  };

  try {
    await sink.send(payload);
  } catch (e) {
    if (!(e instanceof LeadSinkError)) throw e;
    deps.log(`lead for unit ${unit.code} not delivered: ${e.message}`);
    return answer(502, { ok: false, error: "delivery-failed" });
  }
  return answer(200, { ok: true });
}
