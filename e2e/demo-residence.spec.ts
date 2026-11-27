// Smoke test of the photo-based demo: facade photo → floor → unit panel.
import { expect, test, WITHOUT_WEBGL } from "./fixtures";

test("demo residence: facade → second floor → unit panel", async ({ page }) => {
  await page.goto("/p/demo-residence?lang=en");
  await page.getByRole("button", { name: "Second floor" }).click();
  await expect(page).toHaveURL(/\/p\/demo-residence\/floor-2\?/);
  await page.locator('[data-hotspot="a"]').click();
  await expect(page).toHaveURL(/unit=2A/);
  await expect(page.getByRole("heading", { name: "Unit 2A" })).toBeVisible();
});

test("demo residence: 3D building from the shortcuts, a floor opens its plan", async ({ page }) => {
  await page.goto("/p/demo-residence?lang=en");
  const views = page.getByRole("navigation", { name: "3D and 360° views" });
  await expect(views.getByRole("link")).toHaveCount(4);
  await views.getByRole("link", { name: /3D building/ }).click();
  await expect(page).toHaveURL(/\/p\/demo-residence\/building-3d/);
  await expect(page.locator("[data-model-view]")).toHaveAttribute("data-model-view", "3d");
  await expect(page.locator("[data-model-view] canvas")).toBeVisible();
  await page.getByRole("list", { name: "Units in this view" }).getByRole("button", { name: "Third floor" }).click();
  await expect(page).toHaveURL(/\/p\/demo-residence\/floor-3/);
});

test("demo residence: 360° panorama view, and its poster without WebGL", async ({ page }) => {
  await page.goto("/p/demo-residence/rooftop-360?lang=en");
  await expect(page.locator("[data-panorama-view]")).toHaveAttribute("data-panorama-view", "360");
  await expect(page.getByRole("img", { name: /Rooftop \(360°\): 360° view/ })).toBeVisible();
  await page.addInitScript(WITHOUT_WEBGL);
  await page.goto("/p/demo-residence/living-a-360?lang=en");
  await expect(page.locator("[data-panorama-view]")).toHaveAttribute("data-panorama-view", "poster");
  await expect(page.locator("[data-panorama-view] img")).toBeVisible();
});

test("demo residence: counts on the 3D page, and a unit's 360° tour button", async ({ page }) => {
  await page.goto("/p/demo-residence/building-3d?lang=en");
  await expect(page.getByRole("region", { name: "Details" }).getByRole("definition").first()).toHaveText("24");
  await page.goto("/p/demo-residence/floor-2?unit=2B&lang=en");
  await page.getByRole("link", { name: /360° tour: Apartment B master bedroom/ }).click();
  await expect(page).toHaveURL(/\/p\/demo-residence\/bedroom-b-360/);
});
