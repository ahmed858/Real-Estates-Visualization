import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    projects: [
      {
        // Domain, schema, data and tool tests: plain Node.
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["src/**/*.test.ts", "scripts/**/*.test.{ts,mjs}"],
        },
      },
      {
        // React component tests: simulated DOM (happy-dom).
        extends: true,
        test: {
          name: "dom",
          environment: "happy-dom",
          include: ["src/**/*.test.tsx"],
          setupFiles: ["./vitest.setup.dom.ts"],
        },
      },
    ],
  },
});
