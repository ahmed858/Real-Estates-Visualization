// Where the lead form posts. On the site itself pages live under /p/<slug>;
// on a client's own domain they live at the root and /lead is rewritten to
// /p/<slug>/lead by the proxy.
export function leadEndpoint(pathname: string, slug: string): string {
  const base = `/p/${slug}`;
  return pathname === base || pathname.startsWith(`${base}/`) ? `${base}/lead` : "/lead";
}
