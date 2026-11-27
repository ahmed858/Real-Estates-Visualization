import { describe, expect, it } from "vitest";
import type { LeadPayload } from "@/modules/schema";
import { LeadSinkError, WebhookLeadSink } from "./index";

const URL_SECRET = "https://hooks.example.com/secret-token";

const lead: LeadPayload = {
  type: "unit-enquiry",
  version: 1,
  receivedAt: "2026-11-27T01:30:00.000Z",
  project: { slug: "demo-villa", name: "Demo Villa" },
  unit: { code: "A-101", scene: "ground", floor: 0, type: "Apartment", status: "available", price: 2500000 },
  contact: { name: "Mona", phone: "01001234567", message: null },
  locale: "ar",
};

describe("WebhookLeadSink", () => {
  it("POSTs the lead as JSON to the webhook", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const sink = new WebhookLeadSink(URL_SECRET, async (url, init) => {
      calls.push({ url, init });
      return new Response(null, { status: 204 });
    });
    await sink.send(lead);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(URL_SECRET);
    expect(calls[0].init?.method).toBe("POST");
    expect(new Headers(calls[0].init?.headers).get("content-type")).toBe("application/json");
    expect(JSON.parse(String(calls[0].init?.body))).toEqual(lead);
    expect(calls[0].init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("rejects on a non-2xx answer without the URL in the message", async () => {
    const sink = new WebhookLeadSink(URL_SECRET, async () => new Response("no", { status: 500 }));
    const error = await sink.send(lead).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(LeadSinkError);
    expect((error as Error).message).toContain("HTTP 500");
    expect((error as Error).message).not.toContain("secret-token");
  });

  it("rejects when the webhook cannot be reached", async () => {
    const sink = new WebhookLeadSink(URL_SECRET, async () => {
      throw new TypeError(`fetch failed for ${URL_SECRET}`);
    });
    const error = await sink.send(lead).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(LeadSinkError);
    expect((error as Error).message).not.toContain("secret-token");
  });
});
