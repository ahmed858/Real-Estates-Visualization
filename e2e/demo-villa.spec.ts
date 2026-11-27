// Smoke tests of the visitor pages of the demo villa in a real browser.
import { expect, test, WITHOUT_WEBGL } from "./fixtures";

test("facade → floor → unit panel", async ({ page }) => {
  await page.goto("/p/demo-villa?lang=en");
  await page.getByRole("button", { name: "Ground floor" }).click();
  await expect(page).toHaveURL(/\/p\/demo-villa\/ground\?/);
  await page.locator('[data-hotspot="g-01"]').click();
  await expect(page).toHaveURL(/unit=G-01/);
  await expect(page.getByRole("heading", { name: "Unit G-01" })).toBeVisible();
});

test("units table filter", async ({ page }) => {
  await page.goto("/p/demo-villa/units?lang=en");
  const rows = page.locator("tr[data-unit]");
  await expect(rows).toHaveCount(5);
  await page.getByRole("search").getByLabel("Sold").check();
  await expect(rows).not.toHaveCount(5);
  for (const status of await rows.locator("[data-status]").evaluateAll((els) => els.map((e) => e.getAttribute("data-status")))) expect(status).toBe("sold");
  await expect(page).toHaveURL(/status=sold/);
});

test("turntable opens on ?frame= and turns with the slider", async ({ page }) => {
  await page.goto("/p/demo-villa/turntable?lang=en&frame=5");
  await expect(page.locator("[data-rotation-frame]")).toHaveAttribute("data-rotation-frame", "5");
  const slider = page.getByRole("slider", { name: "360° view: turn the view" });
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("[data-rotation-frame]")).toHaveAttribute("data-rotation-frame", "6");
  await expect(slider).toHaveAttribute("aria-valuetext", "6 / 24");
});

test("3D scene shows the model canvas when WebGL works", async ({ page }) => {
  await page.goto("/p/demo-villa/model?lang=en");
  await expect(page.locator("[data-model-view]")).toHaveAttribute("data-model-view", "3d");
  await expect(page.locator("[data-model-view] canvas")).toBeVisible();
  await expect(page.getByRole("list", { name: "Units in this view" }).getByRole("button")).toHaveCount(4);
});

test("3D scene shows the poster without WebGL", async ({ page }) => {
  await page.addInitScript(WITHOUT_WEBGL);
  await page.goto("/p/demo-villa/model?lang=en");
  await expect(page.locator("[data-model-view]")).toHaveAttribute("data-model-view", "poster");
  await expect(page.locator("[data-model-view] img")).toBeVisible();
  await expect(page.locator("[data-model-view] canvas")).toHaveCount(0);
});
