import type { Db } from "@/db";
import type { EditorValues } from "@/components/quote-editor";
import { quoteVersions } from "@/db/schema";
import { toFixed2 } from "@/lib/numbers";
import { listCatalog } from "./catalog";
import { listClients } from "./clients";

/** Clients and active catalog items the editor offers. */
export async function editorOptions(db: Db, businessId: string) {
  const [clients, catalog] = await Promise.all([
    listClients(db, businessId),
    listCatalog(db, businessId, { onlyActive: true }),
  ]);
  return {
    clients: clients.map((c) => ({ id: c.id, name: c.name })),
    catalog: catalog.map((c) => ({
      id: c.id,
      name: c.name,
      unit: c.unit,
      priceCents: c.priceCents,
      currency: c.currency,
      vatRateBps: c.vatRateBps,
    })),
  };
}

export function editorValues(
  version: typeof quoteVersions.$inferSelect,
  clientId: string | null,
): EditorValues {
  return {
    client: clientId ? { kind: "existing", id: clientId } : { kind: "new", data: version.client },
    items: version.items.map((i) => ({
      catalogItemId: i.catalogItemId,
      name: i.name,
      unit: i.unit,
      quantity: toFixed2(i.quantityHundredths),
      unitPrice: toFixed2(i.unitPriceCents),
      vatRateBps: i.vatRateBps,
    })),
    discount: !version.discount
      ? { kind: "none", value: "" }
      : version.discount.kind === "percent"
        ? { kind: "percent", value: toFixed2(version.discount.bps) }
        : { kind: "amount", value: toFixed2(version.discount.cents) },
    vatMode: version.vatMode,
    currency: version.currency,
    validUntil: version.validUntil,
    notes: version.notes,
    terms: version.terms,
  };
}
