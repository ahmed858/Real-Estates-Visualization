// LEAD_WEBHOOKS maps project slugs to the webhook that receives their leads:
// "slug=https://...,slug=https://...". Webhook URLs are secrets, so they live
// in an environment variable and never in project.json or in a log line.

export const LEAD_WEBHOOKS_ENV = "LEAD_WEBHOOKS";

/** Same rule as project folder names. */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.username === "" && url.password === "";
  } catch {
    return false;
  }
}

/**
 * Parses "slug=url,slug=url". Bad entries (no "=", bad slug, a URL that is not
 * https, a slug listed twice) are skipped and reported through `warn` by slug
 * only, so one typo never takes the other projects' forms down.
 */
export function parseLeadWebhooks(value: string | undefined, warn: (message: string) => void = () => {}): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  for (const [index, raw] of (value ?? "").split(",").entries()) {
    const entry = raw.trim();
    if (entry === "") continue;
    const eq = entry.indexOf("=");
    const slug = eq < 0 ? "" : entry.slice(0, eq).trim();
    const url = eq < 0 ? "" : entry.slice(eq + 1).trim();
    const label = SLUG.test(slug) ? `entry for "${slug}"` : `entry ${index + 1}`;
    if (eq < 0 || !SLUG.test(slug)) {
      warn(`${LEAD_WEBHOOKS_ENV}: ignoring ${label} (expected slug=https://..., e.g. demo-villa=https://crm.example/webhook)`);
      continue;
    }
    if (!isHttpsUrl(url)) {
      warn(`${LEAD_WEBHOOKS_ENV}: ignoring ${label} (the webhook must be an https:// URL without a user name or password)`);
      continue;
    }
    if (map.has(slug)) {
      warn(`${LEAD_WEBHOOKS_ENV}: ignoring the second ${label} (each project has one webhook)`);
      continue;
    }
    map.set(slug, url);
  }
  return map;
}
