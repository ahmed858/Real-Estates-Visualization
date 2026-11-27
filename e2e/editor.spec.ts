// Smoke test of the owner's editor, on the server started with
// EDITOR_ENABLED=true: draw a shape, give it a unit, watch the live checks,
// download project.json and read the new hotspot back.
import { readFile } from "node:fs/promises";
import { parseProjectConfig } from "@/modules/schema";
import { expect, test } from "./fixtures";

test("draw a hotspot, pick its unit and download project.json", async ({ page }) => {
  await page.goto("/editor/demo-villa?scene=ground");
  const canvas = page.getByRole("application", { name: "Ground floor: drawing canvas" });
  const problems = page.getByRole("region", { name: "Problems" });
  const download = page.getByRole("button", { name: "Download project.json" });
  await expect(problems).toContainText("No problems found.");

  // A triangle in the empty margin of the plan (top left), closed on its first point.
  for (const [x, y] of [[12, 12], [70, 12], [70, 70], [12, 12]]) await canvas.click({ position: { x, y } });
  await expect(canvas).toHaveAttribute("data-drawing", "false");
  await expect(page.locator('polygon[data-hotspot="shape-1"]')).toHaveAttribute("aria-selected", "true");
  await expect(problems).toContainText("1 error");
  await expect(download).toBeDisabled();

  const picker = page.getByRole("form", { name: "Hotspot target" });
  const [kind, value] = [picker.locator("select").nth(0), picker.locator("select").nth(1)];
  await kind.selectOption("unit");
  await value.selectOption("R-01");
  await picker.getByLabel("Hotspot id").fill("smoke-test");
  await picker.getByRole("button", { name: "Apply" }).click();
  await expect(problems).not.toContainText("error");
  await expect(download).toBeEnabled();

  const [file] = await Promise.all([page.waitForEvent("download"), download.click()]);
  expect(file.suggestedFilename()).toBe("project.json");
  const parsed = parseProjectConfig(JSON.parse(await readFile((await file.path())!, "utf8")));
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.errors));
  const ground = parsed.value.root.children.find((s) => s.id === "ground")!;
  expect(ground.hotspots.find((h) => h.id === "smoke-test")).toMatchObject({ target: { unit: "R-01" } });
  expect(ground.hotspots.find((h) => h.id === "smoke-test")!.points).toHaveLength(3);
});
