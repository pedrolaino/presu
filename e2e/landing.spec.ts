import { expect, test } from "@playwright/test";

test("landing page loads", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Presupuestos que tu cliente acepta desde el celular.",
    }),
  ).toBeVisible();
});
