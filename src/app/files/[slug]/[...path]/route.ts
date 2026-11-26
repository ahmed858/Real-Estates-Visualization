// Serves a project's images: GET /files/<slug>/<path>, e.g. /files/demo-villa/images/facade.svg.
import { join } from "node:path";
import { readProjectImage } from "@/modules/data-sources";

export async function GET(_request: Request, ctx: RouteContext<"/files/[slug]/[...path]">) {
  const { slug, path } = await ctx.params;
  const file = await readProjectImage(join(process.cwd(), "projects"), slug, path);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.body), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
      // SVGs are client data: never let them run scripts on this origin.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
