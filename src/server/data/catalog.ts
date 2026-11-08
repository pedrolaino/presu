import { and, asc, eq, ilike, inArray, or } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db";
import { catalogItems } from "@/db/schema";
import { previewIncrease } from "@/domain/pricing";
import { parseFixed2 } from "@/lib/numbers";
import { isUuid, likePattern, requiredText, text } from "../forms";

export const VAT_RATES = [2100, 1050, 2700, 0] as const;

export const vatRate = z.coerce
  .number()
  .refine((v) => (VAT_RATES as readonly number[]).includes(v), "Elegí una alícuota.");

export const currency = z.enum(["ARS", "USD"], "Elegí una moneda.");

export const amount = (message: string) =>
  z.string().transform((v, ctx) => {
    const parsed = parseFixed2(v);
    if (parsed === null) ctx.addIssue({ code: "custom", message });
    return parsed ?? 0;
  });

export const catalogInput = z.object({
  name: requiredText(120, "Poné un nombre."),
  description: text(500),
  unit: requiredText(30, "Poné una unidad (por ejemplo: unidad, hora, m²)."),
  priceCents: amount("Poné un precio como 1500 o 1500,50."),
  currency,
  vatRateBps: vatRate,
  category: text(60),
  active: z
    .literal("on")
    .optional()
    .transform((v) => v === "on"),
});
export type CatalogInput = z.infer<typeof catalogInput>;

const own = (businessId: string, id: string) =>
  and(eq(catalogItems.businessId, businessId), eq(catalogItems.id, id));

export function listCatalog(
  db: Db,
  businessId: string,
  filter: { search?: string; category?: string; onlyActive?: boolean } = {},
) {
  const q = likePattern(filter.search?.trim() ?? "");
  return db
    .select()
    .from(catalogItems)
    .where(
      and(
        eq(catalogItems.businessId, businessId),
        filter.search?.trim()
          ? or(ilike(catalogItems.name, q), ilike(catalogItems.description, q))
          : undefined,
        filter.category ? eq(catalogItems.category, filter.category) : undefined,
        filter.onlyActive ? eq(catalogItems.active, true) : undefined,
      ),
    )
    .orderBy(asc(catalogItems.category), asc(catalogItems.name));
}

export async function listCategories(db: Db, businessId: string) {
  const rows = await db
    .selectDistinct({ category: catalogItems.category })
    .from(catalogItems)
    .where(eq(catalogItems.businessId, businessId))
    .orderBy(asc(catalogItems.category));
  return rows.map((r) => r.category).filter(Boolean);
}

export async function getCatalogItem(db: Db, businessId: string, id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db.select().from(catalogItems).where(own(businessId, id));
  return row ?? null;
}

export async function createCatalogItem(db: Db, businessId: string, input: CatalogInput) {
  const [row] = await db
    .insert(catalogItems)
    .values({ businessId, ...input })
    .returning({ id: catalogItems.id });
  return row.id;
}

export async function updateCatalogItem(
  db: Db,
  businessId: string,
  id: string,
  input: CatalogInput,
) {
  if (!isUuid(id)) return false;
  const rows = await db
    .update(catalogItems)
    .set(input)
    .where(own(businessId, id))
    .returning({ id: catalogItems.id });
  return rows.length > 0;
}

export async function deleteCatalogItem(db: Db, businessId: string, id: string) {
  if (!isUuid(id)) return false;
  const rows = await db
    .delete(catalogItems)
    .where(own(businessId, id))
    .returning({ id: catalogItems.id });
  return rows.length > 0;
}

export type Selection = { category: string } | { ids: string[] };

function selectionFilter(businessId: string, selection: Selection) {
  return and(
    eq(catalogItems.businessId, businessId),
    "category" in selection
      ? eq(catalogItems.category, selection.category)
      : inArray(catalogItems.id, selection.ids.filter(isUuid)),
  );
}

export async function previewBulkIncrease(
  db: Db,
  businessId: string,
  selection: Selection,
  bps: number,
) {
  if ("ids" in selection && selection.ids.filter(isUuid).length === 0) return [];
  const items = await db
    .select()
    .from(catalogItems)
    .where(selectionFilter(businessId, selection))
    .orderBy(asc(catalogItems.name));
  return previewIncrease(items, bps).map((p, i) => ({ ...p, currency: items[i].currency }));
}

/** Only catalog prices change; quotes keep the prices they were created with. */
export async function applyBulkIncrease(
  db: Db,
  businessId: string,
  selection: Selection,
  bps: number,
) {
  if ("ids" in selection && selection.ids.filter(isUuid).length === 0) return 0;
  return db.transaction(async (tx) => {
    const items = await tx
      .select()
      .from(catalogItems)
      .where(selectionFilter(businessId, selection))
      .for("update");
    for (const p of previewIncrease(items, bps)) {
      await tx.update(catalogItems).set({ priceCents: p.afterCents }).where(own(businessId, p.id));
    }
    return items.length;
  });
}
