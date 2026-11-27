// Where a visitor's lead goes. The Adapter target: the lead route depends on
// LeadSink, never on how a lead reaches the client's CRM.
import type { LeadPayload } from "@/modules/schema";
import type { FetchLike } from "./google-sheet-csv-source";

export interface LeadSink {
  /** Delivers one lead. Rejects with LeadSinkError when the destination did not accept it. */
  send(lead: LeadPayload): Promise<void>;
}

export class LeadSinkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeadSinkError";
  }
}

/** Give up on a webhook that has not answered after this long. */
export const LEAD_WEBHOOK_TIMEOUT_MS = 8000;

/** POSTs the lead as one JSON document. Any 2xx answer counts as delivered. */
export class WebhookLeadSink implements LeadSink {
  constructor(
    private readonly url: string,
    private readonly fetchFn: FetchLike = (url, init) => fetch(url, init),
    private readonly timeoutMs: number = LEAD_WEBHOOK_TIMEOUT_MS,
  ) {}

  async send(lead: LeadPayload): Promise<void> {
    let response: Response;
    try {
      response = await this.fetchFn(this.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "unit-explorer-leads/1" },
        body: JSON.stringify(lead),
        signal: AbortSignal.timeout(this.timeoutMs),
        redirect: "error",
        cache: "no-store",
      });
    } catch (e) {
      // The URL is a secret: never put it in an error message or a log.
      throw new LeadSinkError(`webhook for "${lead.project.slug}" could not be reached (${e instanceof Error ? e.name : "error"})`);
    }
    if (!response.ok) throw new LeadSinkError(`webhook for "${lead.project.slug}" answered HTTP ${response.status}`);
  }
}
