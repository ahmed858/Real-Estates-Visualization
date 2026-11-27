// Request proxy (Next.js 16 renamed middleware to proxy). Only job: a client's
// own domain, listed in PROJECT_DOMAINS, shows that client's project and
// nothing else. Hosts not in the list are served as usual.
import { NextResponse, type NextRequest } from "next/server";
import { parseProjectDomains, PROJECT_DOMAINS_ENV, routeForHost } from "./app/project-domains";

const domains = parseProjectDomains(process.env[PROJECT_DOMAINS_ENV], (message) => console.warn(message));

export function proxy(request: NextRequest) {
  if (domains.size === 0) return NextResponse.next();
  const route = routeForHost(domains, request.headers.get("host") ?? "", request.nextUrl.pathname);
  if (route.kind === "not-found") return new NextResponse("Not found", { status: 404 });
  if (route.kind === "rewrite") {
    const url = request.nextUrl.clone();
    url.pathname = route.path;
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  // Everything except Next.js build assets and the favicon.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
