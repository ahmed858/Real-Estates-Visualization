// Browser smoke tests (`npm run e2e`): Chromium against the production build
// of the committed demo projects. Run `npm run build` first; Playwright starts
// `next start` itself, twice: a visitor server, and an editor server with
// EDITOR_ENABLED=true (read per request, so one build serves both). The editor
// only reads project files and offers project.json as a download, so it never
// changes the committed demos. CI runs these in their own job after the build.
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3200);
const EDITOR_PORT = PORT + 1;
const EDITOR_SPEC = /editor\.spec\.ts$/;
// Software WebGL, so the 3D scene draws on CI machines without a GPU.
const chromium = { ...devices["Desktop Chrome"], launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] } };

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  use: {
    trace: "off",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "visitor", testIgnore: EDITOR_SPEC, use: { ...chromium, baseURL: `http://localhost:${PORT}` } },
    { name: "editor", testMatch: EDITOR_SPEC, use: { ...chromium, baseURL: `http://localhost:${EDITOR_PORT}` } },
  ],
  webServer: [
    {
      // Visitor server: the editor must answer 404 here.
      command: `npx next start -p ${PORT}`,
      url: `http://localhost:${PORT}/p/demo-villa`,
      env: { EDITOR_ENABLED: "" },
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: `npx next start -p ${EDITOR_PORT}`,
      url: `http://localhost:${EDITOR_PORT}/editor/demo-villa`,
      env: { EDITOR_ENABLED: "true" },
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
