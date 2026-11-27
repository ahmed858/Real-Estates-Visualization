import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { FileProjectSource, LeadSinkError, ProjectSourceError, type LeadSink, type LoadedProject, type ProjectSource } from "@/modules/data-sources";
import type { LeadPayload } from "@/modules/schema";
import { handleLeadRequest, LEAD_BODY_MAX_BYTES, type LeadHandlerDeps } from "./lead-handler";
import { FixedWindowRateLimiter } from "./lead-rate-limit";

const PROJECTS = new FileProjectSource(fileURLToPath(new URL("../../../projects", import.meta.url)));
const SLUG = "demo-villa";
let demo: LoadedProject;
beforeAll(async () => {
  demo = await PROJECTS.load(SLUG);
});

class RecordingSink implements LeadSink {
  readonly sent: LeadPayload[] = [];
  constructor(private readonly fail = false) {}
  async send(lead: LeadPayload) {
    if (this.fail) throw new LeadSinkError("webhook answered HTTP 500");
    this.sent.push(lead);
  }
}

function setup(overrides: Partial<LeadHandlerDeps> = {}) {
  const sink = new RecordingSink();
  const logs: string[] = [];
  const deps: LeadHandlerDeps = {
    projects: PROJECTS,
    sinkFor: (slug) => (slug === SLUG ? sink : undefined),
    limiter: new FixedWindowRateLimiter({ limit: 5, windowMs: 60_000 }),
    now: () => new Date("2026-11-27T01:30:00Z"),
    log: (m) => logs.push(m),
    ...overrides,
  };
  return { sink, logs, deps };
}

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`https://example.com/p/${SLUG}/lead`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.5", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const form = () => ({ unitCode: demo.units[0].code, name: "Mona", phone: "+20 100 123 4567", message: "Call me after 5", locale: "en", website: "" });

describe("handleLeadRequest", () => {
  it("forwards a valid lead with the unit's details and answers ok", async () => {
    const { sink, deps } = setup();
    const response = await handleLeadRequest(SLUG, post(form()), deps);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    const unit = demo.units[0];
    expect(sink.sent).toEqual([
      {
        type: "unit-enquiry",
        version: 1,
        receivedAt: "2026-11-27T01:30:00.000Z",
        project: { slug: SLUG, name: demo.config.project.name[demo.config.project.defaultLocale] },
        unit: { code: unit.code, scene: unit.scene, floor: unit.floor, type: unit.type, status: unit.status, price: unit.price },
        contact: { name: "Mona", phone: "+20 100 123 4567", message: "Call me after 5" },
        locale: "en",
      },
    ]);
  });

  it("uses the project's default language and null for no message", async () => {
    const { sink, deps } = setup();
    const { message: _m, locale: _l, ...rest } = form();
    await handleLeadRequest(SLUG, post(rest), deps);
    expect(sink.sent[0].locale).toBe(demo.config.project.defaultLocale);
    expect(sink.sent[0].contact.message).toBeNull();
  });

  it("answers 404 for a project without a webhook, before reading anything", async () => {
    const { deps } = setup();
    const response = await handleLeadRequest("other", post(form()), deps);
    expect(response.status).toBe(404);
  });

  it("answers 404 for a hidden or missing project that has a webhook", async () => {
    const hidden: ProjectSource = {
      load: async (slug) => {
        throw new ProjectSourceError(slug, "not-found");
      },
      list: async () => [],
    };
    const { sink, deps } = setup({ projects: hidden });
    expect((await handleLeadRequest(SLUG, post(form()), deps)).status).toBe(404);
    expect(sink.sent).toEqual([]);
  });

  it("silently drops a request with the honeypot filled", async () => {
    const { sink, deps } = setup();
    const response = await handleLeadRequest(SLUG, post({ ...form(), website: "http://spam.example" }), deps);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(sink.sent).toEqual([]);
  });

  it("names the invalid fields", async () => {
    const { sink, deps } = setup();
    const response = await handleLeadRequest(SLUG, post({ ...form(), name: "", phone: "abc" }), deps);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "invalid", fields: ["name", "phone"] });
    expect(sink.sent).toEqual([]);
  });

  it("rejects a unit code the project does not have", async () => {
    const { deps } = setup();
    const response = await handleLeadRequest(SLUG, post({ ...form(), unitCode: "NOPE-1" }), deps);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "invalid", fields: ["unitCode"] });
  });

  it("rejects non-JSON, broken JSON and oversized bodies", async () => {
    const { deps } = setup();
    expect((await handleLeadRequest(SLUG, post(form(), { "content-type": "text/plain" }), deps)).status).toBe(415);
    expect((await handleLeadRequest(SLUG, post("{not json"), deps)).status).toBe(400);
    expect((await handleLeadRequest(SLUG, post({ ...form(), message: "x".repeat(LEAD_BODY_MAX_BYTES) }), deps)).status).toBe(413);
  });

  it("limits requests per IP and says when to retry", async () => {
    const { sink, deps } = setup({ limiter: new FixedWindowRateLimiter({ limit: 2, windowMs: 60_000 }, () => 0) });
    for (let i = 0; i < 2; i++) expect((await handleLeadRequest(SLUG, post(form()), deps)).status).toBe(200);
    const limited = await handleLeadRequest(SLUG, post(form()), deps);
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("60");
    expect((await handleLeadRequest(SLUG, post(form(), { "x-forwarded-for": "198.51.100.7" }), deps)).status).toBe(200);
    expect(sink.sent).toHaveLength(3);
  });

  it("answers 502 and logs when the webhook fails", async () => {
    const failing = new RecordingSink(true);
    const { deps, logs } = setup({ sinkFor: () => failing });
    const response = await handleLeadRequest(SLUG, post(form()), deps);
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ ok: false, error: "delivery-failed" });
    expect(logs).toEqual([`lead for unit ${demo.units[0].code} not delivered: webhook answered HTTP 500`]);
  });

  it("never lets the answer be cached", async () => {
    const { deps } = setup();
    expect((await handleLeadRequest(SLUG, post(form()), deps)).headers.get("cache-control")).toBe("no-store");
  });
});
