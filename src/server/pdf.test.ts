import sharp from "sharp";
import { describe, expect, it } from "vitest";
import type { businesses, quoteVersions } from "@/db/schema";
import { renderQuotePdf } from "./pdf";

const business = {
  name: "Gómez Electricidad",
  address: "Av. Rivadavia 5120, CABA",
  phone: "+54 9 11 4567-2390",
  email: "martin@example.com",
  taxId: "20-28456123-7",
  logo: null,
} as typeof businesses.$inferSelect;

const version = {
  version: 2,
  client: { name: "Laura Fernández", email: "", phone: "", address: "" },
  items: Array.from({ length: 60 }, (_, i) => ({
    catalogItemId: null,
    name: `Cable unipolar 2,5 mm² — tramo ${i + 1}`,
    unit: "metro",
    quantityHundredths: 250,
    unitPriceCents: 125_050,
    vatRateBps: i % 2 ? 2100 : 1050,
  })),
  discount: { kind: "percent", bps: 1000 },
  vatMode: "added",
  currency: "ARS",
  validUntil: "2026-04-25",
  notes: "Incluye materiales.",
  terms: "50 % de anticipo.",
  totalCents: 0,
  sentAt: null,
  createdAt: new Date("2026-04-10T12:00:00Z"),
} as unknown as typeof quoteVersions.$inferSelect;

describe("renderQuotePdf", () => {
  it("renders a multi-page PDF with logo and characters outside Latin-1", async () => {
    const logo = await sharp({
      create: { width: 200, height: 100, channels: 3, background: "#246" },
    })
      .png()
      .toBuffer();
    const pdf = await renderQuotePdf({ ...business, logo }, 7, version);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.toString("latin1").match(/\/Type \/Page\b/g)?.length).toBeGreaterThan(1);
  });
});
