// A client's own domain opens their project. PROJECT_DOMAINS maps hostnames to
// project slugs ("host=slug,host=slug"); on a mapped host the site shows only
// that project: "/" is its root scene, "/units" its table, "/<scene>" a scene.
// Pure functions; src/proxy.ts applies them to each request.

/** Same rule as project folder names. */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** A DNS hostname: dot-separated labels of letters, digits and inner dashes. */
const HOST = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/;

export const PROJECT_DOMAINS_ENV = "PROJECT_DOMAINS";

export type DomainMap = ReadonlyMap<string, string>;

/** Lowercases a Host header value and drops its port. */
export function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/:\d+$/, "");
}

/**
 * Parses "host=slug,host=slug". Bad entries (no "=", bad host or slug, a host
 * listed twice) are skipped and reported through `warn`, so one typo never
 * takes the other domains down.
 */
export function parseProjectDomains(value: string | undefined, warn: (message: string) => void = () => {}): DomainMap {
  const map = new Map<string, string>();
  for (const raw of (value ?? "").split(",")) {
    const entry = raw.trim();
    if (entry === "") continue;
    const eq = entry.indexOf("=");
    const host = eq < 0 ? "" : normalizeHost(entry.slice(0, eq));
    const slug = eq < 0 ? "" : entry.slice(eq + 1).trim();
    if (eq < 0 || !HOST.test(host) || !SLUG.test(slug)) {
      warn(`${PROJECT_DOMAINS_ENV}: ignoring "${entry}" (expected host=slug, e.g. units.example.com=demo-villa)`);
      continue;
    }
    if (map.has(host)) {
      warn(`${PROJECT_DOMAINS_ENV}: ignoring "${entry}" (host "${host}" is already mapped to "${map.get(host)}")`);
      continue;
    }
    map.set(host, slug);
  }
  return map;
}

export type HostRoute =
  /** Not a client domain, or a path of the mapped project: serve as usual. */
  | { kind: "pass" }
  /** Serve this internal path instead. */
  | { kind: "rewrite"; path: string }
  /** Another project, or the editor: does not exist on this domain. */
  | { kind: "not-found" };

const under = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);

/** Where a request for `pathname` on `host` goes. */
export function routeForHost(domains: DomainMap, host: string, pathname: string): HostRoute {
  const slug = domains.get(normalizeHost(host));
  if (slug === undefined) return { kind: "pass" };
  if (under(pathname, `/p/${slug}`) || under(pathname, `/files/${slug}`)) return { kind: "pass" };
  if (under(pathname, "/p") || under(pathname, "/files") || under(pathname, "/editor")) return { kind: "not-found" };
  return { kind: "rewrite", path: pathname === "/" ? `/p/${slug}` : `/p/${slug}${pathname}` };
}
