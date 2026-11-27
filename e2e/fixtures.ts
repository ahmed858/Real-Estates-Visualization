// Shared test fixture: every test fails when the page logs a console error or
// throws an uncaught error (e.g. a hydration mismatch or a crash in the lazily
// loaded 3D canvas), so no spec has to remember to check.
import { expect, test as base } from "@playwright/test";

export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(`console: ${message.text()}`);
      });
      page.on("pageerror", (error) => errors.push(`page error: ${error.message}`));
      await use(errors);
      expect(errors, "the page logged errors").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** Makes the browser report that WebGL is unavailable, as on old or locked-down devices. */
export const WITHOUT_WEBGL = () => {
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, id: string, ...rest: unknown[]) {
    if (id.startsWith("webgl") || id === "experimental-webgl") return null;
    return (original as (this: HTMLCanvasElement, ...args: unknown[]) => RenderingContext | null).call(this, id, ...rest);
  } as typeof HTMLCanvasElement.prototype.getContext;
};
