// Smoke test of the photo-based demo: facade photo → floor → unit panel.
import { expect, test } from "./fixtures";

test("demo residence: facade → second floor → unit panel", async ({ page }) => {
  await page.goto("/p/demo-residence?lang=en");
  await page.getByRole("button", { name: "Second floor" }).click();
  await expect(page).toHaveURL(/\/p\/demo-residence\/floor-2\?/);
  await page.locator('[data-hotspot="a"]').click();
  await expect(page).toHaveURL(/unit=2A/);
  await expect(page.getByRole("heading", { name: "Unit 2A" })).toBeVisible();
});
