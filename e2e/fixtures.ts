import { test as base, expect, type Browser, type Page } from "@playwright/test";

// Each test looks like a different visitor, so the per-IP guest limit does not get in the way.
export const test = base.extend({
  context: async ({ context }, run) => {
    const ip = `10.${rand()}.${rand()}.${rand()}`;
    await context.setExtraHTTPHeaders({ "x-forwarded-for": ip });
    await run(context);
  },
});

const rand = () => Math.floor(Math.random() * 254) + 1;

/** A separate visitor (the client) with its own address and no session. */
export async function newVisitor(browser: Browser) {
  const ip = `10.${rand()}.${rand()}.${rand()}`;
  return browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": ip } });
}

export async function startGuest(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Probar con datos de ejemplo" }).click();
  await expect(page).toHaveURL(/\/app\/quotes$/, { timeout: 30_000 });
}

export { expect };
