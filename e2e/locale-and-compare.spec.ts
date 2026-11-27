// Arabic (the demo's default locale) lays the viewer out right to left; the
// compare page shows the picked units; the lead form stays hidden for a
// project without a webhook (LEAD_WEBHOOKS is unset for these tests).
import { expect, test } from "./fixtures";

test("Arabic is the default and lays the viewer out right to left", async ({ page }) => {
  await page.goto("/p/demo-villa");
  const root = page.locator('[dir="rtl"][lang="ar"]').first();
  await expect(root).toBeVisible();
  await expect(page.getByRole("heading", { name: "الواجهة" })).toBeVisible();
  await page.goto("/p/demo-villa/units");
  await expect(page.locator('[dir="rtl"][lang="ar"] table')).toBeVisible();
  await expect(page.locator("tr[data-unit]")).toHaveCount(5);
});

test("English switches the viewer to left to right", async ({ page }) => {
  await page.goto("/p/demo-villa?lang=en");
  await expect(page.locator('[dir="ltr"][lang="en"]').first()).toBeVisible();
  await expect(page.locator('[dir="rtl"][lang="ar"]')).toHaveCount(0);
});

test("compare page shows the picked units", async ({ page }) => {
  await page.goto("/p/demo-villa/compare?units=G-01,F-02&lang=en");
  await expect(page.getByRole("heading", { name: "Compare units" })).toBeVisible();
  await expect(page.getByText("Unit G-01")).toBeVisible();
  await expect(page.getByText("Unit F-02")).toBeVisible();
  await expect(page.getByText("Unit G-02")).toHaveCount(0);
});

test("no lead form when the project has no webhook", async ({ page }) => {
  await page.goto("/p/demo-villa/ground?unit=G-01&lang=en");
  await expect(page.getByRole("heading", { name: "Unit G-01" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Request a call about this unit" })).toHaveCount(0);
});

test("the editor is not reachable on the visitor server", async ({ page }) => {
  // The page streams (Suspense), so Next sends the not-found page with status 200; check what it shows.
  await page.goto("/editor/demo-villa");
  await expect(page.getByText("This page could not be found.")).toBeVisible();
  await expect(page.getByRole("application")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Download project.json" })).toHaveCount(0);
});
