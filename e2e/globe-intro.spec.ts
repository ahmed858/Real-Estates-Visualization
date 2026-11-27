// Smoke test of the globe intro: the globe, the stages, the way straight in,
// the flat map without WebGL, and the guided descent down to a unit's 360° view.
import { expect, test, WITHOUT_WEBGL } from "./fixtures";

// The idle globe spins, so the marker never holds still for a click; reduced motion stops the spin.
test.use({ reducedMotion: "reduce" });

test("globe intro: draws the globe, steps down a stage and back, and skips straight in", async ({ page }) => {
  await page.goto("/p/demo-residence/explore?lang=en");
  const intro = page.getByTestId("globe-intro");
  await expect(intro).toHaveAttribute("data-mode", "webgl");
  await expect(page.getByTestId("globe-canvas").locator("canvas")).toBeVisible();
  await expect(page.getByTestId("globe-hint")).toHaveText("Pick Egypt to start");
  await page.getByRole("button", { name: "Pick Egypt to start" }).click();
  await expect(intro).toHaveAttribute("data-stage", "country");
  await expect(page).toHaveURL(/stage=country/);
  await expect(page.getByTestId("globe-back")).toBeEnabled();
  await page.getByTestId("globe-back").click();
  await expect(intro).toHaveAttribute("data-stage", "earth");
  await page.getByTestId("globe-skip").click();
  await expect(page).toHaveURL(/\/p\/demo-residence\?lang=en$/);
  await expect(page.getByRole("navigation", { name: "Breadcrumbs" }).getByRole("link", { name: "Location" })).toHaveAttribute("href", "/p/demo-residence/explore?stage=site&lang=en");
});

test("globe intro: the flat map without WebGL, opened on a linked stage", async ({ page }) => {
  await page.addInitScript(WITHOUT_WEBGL);
  await page.goto("/p/demo-residence/explore?stage=site&lang=en");
  const intro = page.getByTestId("globe-intro");
  await expect(intro).toHaveAttribute("data-mode", "static");
  await expect(page.getByTestId("globe-static-map").locator("svg")).toBeVisible();
  await expect(page.getByRole("region", { name: "Near the project" })).toContainText("90th Street");
});

test.describe("guided tour", () => {
  test("globe intro: explore runs the guided tour down to a unit's 360° view", async ({ page }) => {
    await page.goto("/p/demo-residence/explore?lang=en");
    await page.getByTestId("globe-explore").click();
    await expect(page).toHaveURL(/\/p\/demo-residence\?tour=1/);
    await expect(page.getByTestId("tour-bar")).toBeVisible();
    await expect(page).toHaveURL(/\/p\/demo-residence\/floor-\d\?.*tour=1/, { timeout: 10_000 });
    await expect(page).toHaveURL(/unit=/, { timeout: 10_000 });
    await expect(page).toHaveURL(/-360/, { timeout: 10_000 });
  });

  test("globe intro: a press stops the tour where the visitor is", async ({ page }) => {
    await page.goto("/p/demo-residence?tour=1&lang=en");
    await expect(page.getByTestId("tour-bar")).toBeVisible();
    await page.getByRole("button", { name: "Stop the tour" }).click();
    await expect(page.getByTestId("tour-bar")).toHaveCount(0);
    await page.waitForTimeout(2500);
    await expect(page).toHaveURL(/\/p\/demo-residence\?lang=en$/);
  });
});
