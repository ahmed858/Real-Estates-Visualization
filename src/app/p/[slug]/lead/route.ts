// POST /p/<slug>/lead: the unit enquiry form posts here. A static segment, so
// it wins over /p/<slug>/<sceneId>; no scene may be called "lead".
// Webhooks come from LEAD_WEBHOOKS (see .env.example and docs/leads.md).
import { join } from "node:path";
import { FileProjectSource, LEAD_WEBHOOKS_ENV, parseLeadWebhooks, WebhookLeadSink } from "@/modules/data-sources";
import { handleLeadRequest } from "../../lead-handler";
import { FixedWindowRateLimiter } from "../../lead-rate-limit";
import { visitorProjectSource } from "../../project-page-state";

const projects = visitorProjectSource(new FileProjectSource(join(process.cwd(), "projects")), process.env);
const webhooks = parseLeadWebhooks(process.env[LEAD_WEBHOOKS_ENV], (m) => console.warn(m));
/** 5 enquiries per visitor IP every 10 minutes, per server instance. */
const limiter = new FixedWindowRateLimiter({ limit: 5, windowMs: 10 * 60 * 1000 });

export async function POST(request: Request, ctx: RouteContext<"/p/[slug]/lead">) {
  const { slug } = await ctx.params;
  return handleLeadRequest(slug, request, {
    projects,
    sinkFor: (s) => {
      const url = webhooks.get(s);
      return url === undefined ? undefined : new WebhookLeadSink(url);
    },
    limiter,
    now: () => new Date(),
    log: (m) => console.error(m),
  });
}
