import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Project folders are read at request time; ship them with the server routes.
  outputFileTracingIncludes: {
    "/files/*": ["./projects/**/*"],
    "/p/**": ["./projects/**/*"],
    "/editor/**": ["./projects/**/*"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
