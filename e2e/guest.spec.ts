import { expect, newVisitor, startGuest, test } from "./fixtures";

test("guest account starts with sample quotes in every state", async ({ page }) => {
  await startGuest(page);
  await expect(page.getByRole("note")).toContainText("cuenta de prueba");
  const rows = page.locator("a.row");
  for (const status of ["Borrador", "Enviado", "Visto", "Aceptado", "Rechazado", "Vencido"]) {
    await expect(rows.filter({ hasText: status }).first()).toBeVisible();
  }

  await page.getByLabel("Estado").selectOption("expired");
  await page.getByRole("button", { name: "Filtrar" }).click();
  await expect(page.locator("a.row")).toHaveCount(1);

  await page.getByRole("link", { name: "Métricas" }).click();
  await expect(page.getByText("Tasa de aceptación")).toBeVisible();
  await expect(page.getByText("71,4 %")).toBeVisible();
});

test("an expired quote cannot be accepted from its link", async ({ page, browser }) => {
  await startGuest(page);
  await page.locator("a.row", { hasText: "Vencido" }).click();
  const url = await page.getByLabel("Link para el cliente").inputValue();

  const client = await newVisitor(browser);
  const clientPage = await client.newPage();
  await clientPage.goto(url);
  await expect(clientPage.getByText(/Este presupuesto venció/)).toBeVisible();
  await expect(clientPage.getByRole("button", { name: "Aceptar presupuesto" })).toHaveCount(0);
  await client.close();
});
