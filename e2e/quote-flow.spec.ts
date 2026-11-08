import { expect, newVisitor, startGuest, test } from "./fixtures";

test("owner creates and shares a quote, the client accepts it, the owner sees the history", async ({
  page,
  browser,
}) => {
  await startGuest(page);

  await page.getByRole("link", { name: "Nuevo presupuesto" }).click();
  await expect(page.getByRole("heading", { name: "Nuevo presupuesto" })).toBeVisible();
  await page.getByLabel("Cliente", { exact: true }).selectOption("new");
  await page.getByLabel("Nombre", { exact: true }).fill("Sofía Benítez");
  const outlet = page.locator("#catalog-pick option", { hasText: "Instalación de tomacorriente" });
  await page.getByLabel("Agregar del catálogo").selectOption((await outlet.getAttribute("value"))!);
  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  await page.getByLabel("Cantidad").fill("3");
  await page.getByRole("button", { name: "Agregar ítem libre" }).click();
  await page.getByLabel("Descripción").nth(1).fill("Cableado de cocina");
  await page.getByLabel("Cantidad").nth(1).fill("1");
  await page.getByLabel("Precio unitario").nth(1).fill("45000");
  // 3 x 22.000 + 45.000 = 111.000, plus 21% VAT
  await expect(page.locator(".totals")).toContainText("$ 134.310,00");
  await page.getByRole("button", { name: "Crear presupuesto" }).click();

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Sofía Benítez");
  const status = page.locator(".page-head .status");
  await expect(status).toHaveText("Borrador");
  const url = await page.getByLabel("Link para el cliente").inputValue();
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Copiar link" }).click();
  await expect(status).toHaveText("Enviado");

  // The client opens the link in a separate browser context, without an account.
  const client = await newVisitor(browser);
  const clientPage = await client.newPage();
  await clientPage.goto(url);
  await expect(clientPage.getByRole("heading", { level: 1 })).toContainText("Sofía Benítez");
  await expect(clientPage.getByText("$ 134.310,00").first()).toBeVisible();
  await page.reload();
  await expect(status).toHaveText("Visto");

  await clientPage.getByLabel("Tu nombre").fill("Sofía Benítez");
  await clientPage.getByRole("button", { name: "Aceptar presupuesto" }).click();
  await expect(clientPage.locator(".signature")).toContainText("Sofía Benítez");
  await client.close();

  await page.reload();
  await expect(status).toHaveText("Aceptado");
  const timeline = page.getByRole("region", { name: "Historial" });
  for (const event of ["Creado", "Enviado", "Visto por el cliente", "Aceptado"]) {
    await expect(timeline).toContainText(event);
  }
  await expect(page.getByRole("link", { name: "Editar" })).toHaveCount(0);
});

test("editing a sent quote creates a version the client sees once it is sent", async ({
  page,
  browser,
}) => {
  await startGuest(page);
  await page
    .locator("a.row")
    .filter({ hasText: "Consorcio" })
    .filter({ hasText: "Enviado" })
    .click();
  const url = await page.getByLabel("Link para el cliente").inputValue();

  await page.getByRole("link", { name: "Editar" }).click();
  await expect(page.getByRole("heading", { name: /Editar presupuesto/ })).toBeVisible();
  await expect(page.getByText(/se crea la versión 2/)).toBeVisible();
  await page.getByLabel("Cantidad").first().fill("2");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("El cliente sigue viendo la versión 1")).toBeVisible();

  const client = await newVisitor(browser);
  const clientPage = await client.newPage();
  await clientPage.goto(url);
  await expect(clientPage.locator(".item-meta").first()).toContainText("1 unidad");

  await page.getByRole("button", { name: "Marcar como enviado" }).click();
  await expect(page.getByRole("button", { name: "Marcar como enviado" })).toHaveCount(0);
  await clientPage.reload();
  await expect(clientPage.locator(".item-meta").first()).toContainText("2 unidad");
  await client.close();
});
