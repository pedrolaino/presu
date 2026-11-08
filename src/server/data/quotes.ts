import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db";
import {
  businesses,
  catalogItems,
  clients,
  quoteEvents,
  quotes,
  quoteVersions,
  type ClientSnapshot,
  type QuoteEventType,
} from "@/db/schema";
import { addDays, todayInArgentina } from "@/domain/dates";
import { newShareToken } from "@/domain/share";
import { displayStatus, transition, type DisplayStatus, type QuoteStatus } from "@/domain/status";
import { computeTotals, type Discount } from "@/domain/totals";
import {
  latestVersion,
  liveVersion,
  planEdit,
  repriceFromCatalog,
  type Currency,
  type VersionItem,
} from "@/domain/versions";
import { parseFixed2 } from "@/lib/numbers";
import { isUuid, likePattern, requiredText, text } from "../forms";
import { amount, currency, vatRate } from "./catalog";
import { clientInput } from "./clients";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type RandomBytes = (n: number) => Uint8Array;

const itemInput = z
  .object({
    catalogItemId: z.string().nullable(),
    name: requiredText(120, "Cada ítem necesita un nombre."),
    unit: text(30),
    quantity: amount("Revisá las cantidades: hasta 2 decimales."),
    unitPrice: amount("Revisá los precios: hasta 2 decimales."),
    vatRateBps: vatRate,
  })
  .refine((i) => i.quantity > 0, "Las cantidades tienen que ser mayores a cero.")
  .transform((i): VersionItem => ({
    catalogItemId: i.catalogItemId && isUuid(i.catalogItemId) ? i.catalogItemId : null,
    name: i.name,
    unit: i.unit,
    quantityHundredths: i.quantity,
    unitPriceCents: i.unitPrice,
    vatRateBps: i.vatRateBps,
  }));

const discountInput = z
  .object({ kind: z.enum(["none", "percent", "amount"]), value: z.string().max(20) })
  .transform((d, ctx): Discount => {
    if (d.kind === "none") return null;
    const value = parseFixed2(d.value);
    if (value === null || value === 0 || (d.kind === "percent" && value > 10_000)) {
      ctx.addIssue({ code: "custom", message: "Revisá el descuento." });
      return null;
    }
    return d.kind === "percent"
      ? { kind: "percent", bps: value }
      : { kind: "amount", cents: value };
  });

export const quoteInput = z.object({
  client: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("existing"), id: z.string().refine(isUuid, "Elegí un cliente.") }),
    z.object({ kind: z.literal("new"), data: clientInput }),
  ]),
  items: z.array(itemInput).min(1, "Agregá al menos un ítem.").max(100, "Máximo 100 ítems."),
  discount: discountInput,
  vatMode: z.enum(["none", "included", "added"]),
  currency,
  validUntil: z.iso.date("Poné una fecha de validez."),
  notes: text(2000),
  terms: text(2000),
});
export type QuoteInput = z.infer<typeof quoteInput>;

export class QuoteError extends Error {}

async function lockQuote(tx: Tx, businessId: string, quoteId: string) {
  if (!isUuid(quoteId)) throw new QuoteError("No encontramos ese presupuesto.");
  const [quote] = await tx
    .select()
    .from(quotes)
    .where(and(eq(quotes.businessId, businessId), eq(quotes.id, quoteId)))
    .for("update");
  if (!quote) throw new QuoteError("No encontramos ese presupuesto.");
  const versions = await tx.select().from(quoteVersions).where(eq(quoteVersions.quoteId, quote.id));
  return { quote, versions, latest: latestVersion(versions)! };
}

function event(
  tx: Tx,
  quoteId: string,
  type: QuoteEventType,
  now: Date,
  version?: number,
  detail?: string,
) {
  return tx.insert(quoteEvents).values({ quoteId, type, version, detail, createdAt: now });
}

/** Resolves the client to a snapshot, creating it first when it was typed in the editor. */
async function resolveClient(tx: Tx, businessId: string, input: QuoteInput["client"]) {
  if (input.kind === "new") {
    const [row] = await tx
      .insert(clients)
      .values({ businessId, ...input.data })
      .returning();
    return row;
  }
  const [row] = await tx
    .select()
    .from(clients)
    .where(and(eq(clients.businessId, businessId), eq(clients.id, input.id)));
  if (!row) throw new QuoteError("Elegí un cliente.");
  return row;
}

/** Drops links to catalog items that are not this business's or are priced in another currency. */
async function ownItems(tx: Tx, businessId: string, items: VersionItem[], currency: Currency) {
  const ids = items.flatMap((i) => (i.catalogItemId ? [i.catalogItemId] : []));
  if (ids.length === 0) return items;
  const linkable = new Set(
    (
      await tx
        .select({ id: catalogItems.id })
        .from(catalogItems)
        .where(
          and(
            eq(catalogItems.businessId, businessId),
            eq(catalogItems.currency, currency),
            inArray(catalogItems.id, ids),
          ),
        )
    ).map((r) => r.id),
  );
  return items.map((i) =>
    i.catalogItemId && !linkable.has(i.catalogItemId) ? { ...i, catalogItemId: null } : i,
  );
}

function versionValues(
  input: Omit<QuoteInput, "client">,
  client: ClientSnapshot,
  items: VersionItem[],
) {
  let totalCents: number;
  try {
    totalCents = computeTotals({
      lines: items,
      discount: input.discount,
      vatMode: input.vatMode,
    }).totalCents;
  } catch {
    throw new QuoteError("Los montos son demasiado grandes.");
  }
  return {
    client,
    items,
    discount: input.discount,
    vatMode: input.vatMode,
    currency: input.currency,
    validUntil: input.validUntil,
    notes: input.notes,
    terms: input.terms,
    totalCents,
  };
}

const contentOf = (v: typeof quoteVersions.$inferSelect) => ({
  client: v.client,
  items: v.items,
  discount: v.discount,
  vatMode: v.vatMode,
  currency: v.currency,
  validUntil: v.validUntil,
  notes: v.notes,
  terms: v.terms,
  totalCents: v.totalCents,
});

const snapshot = (c: {
  name: string;
  email: string;
  phone: string;
  address: string;
}): ClientSnapshot => ({
  name: c.name,
  email: c.email,
  phone: c.phone,
  address: c.address,
});

/** Takes the next number for the business; the row lock makes concurrent creations wait their turn. */
async function nextNumber(tx: Tx, businessId: string) {
  const [row] = await tx
    .update(businesses)
    .set({ nextQuoteNumber: sql`${businesses.nextQuoteNumber} + 1` })
    .where(eq(businesses.id, businessId))
    .returning({ next: businesses.nextQuoteNumber });
  return row.next - 1;
}

export async function createQuote(
  db: Db,
  businessId: string,
  input: QuoteInput,
  now: Date,
  random: RandomBytes,
) {
  return db.transaction(async (tx) => {
    const client = await resolveClient(tx, businessId, input.client);
    const items = await ownItems(tx, businessId, input.items, input.currency);
    const values = versionValues(input, snapshot(client), items);
    const number = await nextNumber(tx, businessId);
    const [quote] = await tx
      .insert(quotes)
      .values({
        businessId,
        number,
        clientId: client.id,
        shareToken: newShareToken(random),
        createdAt: now,
      })
      .returning({ id: quotes.id, number: quotes.number });
    await tx
      .insert(quoteVersions)
      .values({ quoteId: quote.id, version: 1, ...values, createdAt: now });
    await event(tx, quote.id, "created", now, 1);
    return quote;
  });
}

/** Drafts and unsent versions change in place; once a version was sent, editing adds a new one. */
export async function updateQuote(
  db: Db,
  businessId: string,
  quoteId: string,
  input: QuoteInput,
  now: Date,
) {
  return db.transaction(async (tx) => {
    const { quote, latest } = await lockQuote(tx, businessId, quoteId);
    const plan = planEdit(quote.status, latest.sentAt !== null);
    const client = await resolveClient(tx, businessId, input.client);
    const values = versionValues(
      input,
      snapshot(client),
      await ownItems(tx, businessId, input.items, input.currency),
    );
    await tx.update(quotes).set({ clientId: client.id }).where(eq(quotes.id, quote.id));
    if (plan === "update") {
      await tx.update(quoteVersions).set(values).where(eq(quoteVersions.id, latest.id));
    } else {
      await tx
        .insert(quoteVersions)
        .values({ quoteId: quote.id, version: latest.version + 1, ...values, createdAt: now });
      await event(tx, quote.id, "new_version", now, latest.version + 1);
    }
  });
}

/**
 * Sends the latest version if it was not sent yet and returns the share token (null if revoked).
 * Copying the link of a quote that is already out does nothing else.
 */
export async function markSent(db: Db, businessId: string, quoteId: string, now: Date) {
  return db.transaction(async (tx) => {
    const { quote, latest } = await lockQuote(tx, businessId, quoteId);
    let status = quote.status;
    if (latest.sentAt === null) {
      status = transition({ status: quote.status, validUntil: latest.validUntil }, "send", now);
      await tx.update(quoteVersions).set({ sentAt: now }).where(eq(quoteVersions.id, latest.id));
      await event(tx, quote.id, "sent", now, latest.version);
    }
    await tx
      .update(quotes)
      .set({
        status,
        firstSentAt: quote.firstSentAt ?? (status === "sent" ? now : null),
      })
      .where(eq(quotes.id, quote.id));
    return quote.shareToken;
  });
}

export async function setShareLink(
  db: Db,
  businessId: string,
  quoteId: string,
  random: RandomBytes | null,
) {
  if (!isUuid(quoteId)) return false;
  const rows = await db
    .update(quotes)
    .set({ shareToken: random ? newShareToken(random) : null })
    .where(and(eq(quotes.businessId, businessId), eq(quotes.id, quoteId)))
    .returning({ id: quotes.id });
  return rows.length > 0;
}

export async function duplicateQuote(
  db: Db,
  businessId: string,
  quoteId: string,
  now: Date,
  random: RandomBytes,
) {
  return db.transaction(async (tx) => {
    const { quote, latest } = await lockQuote(tx, businessId, quoteId);
    const [business] = await tx.select().from(businesses).where(eq(businesses.id, businessId));
    const number = await nextNumber(tx, businessId);
    const [copy] = await tx
      .insert(quotes)
      .values({
        businessId,
        number,
        clientId: quote.clientId,
        shareToken: newShareToken(random),
        createdAt: now,
      })
      .returning({ id: quotes.id });
    await tx.insert(quoteVersions).values({
      ...contentOf(latest),
      quoteId: copy.id,
      version: 1,
      validUntil: addDays(todayInArgentina(now), business.defaultValidityDays),
      createdAt: now,
    });
    await event(tx, copy.id, "created", now, 1, `Copia de #${quote.number}`);
    return copy.id;
  });
}

/** Current catalog prices and a new validity for `live`, read through `ex` (the db or a transaction). */
async function repriceVersion(
  ex: Db | Tx,
  businessId: string,
  live: typeof quoteVersions.$inferSelect,
  now: Date,
  lockCatalog = false,
) {
  const [business] = await ex.select().from(businesses).where(eq(businesses.id, businessId));
  const catalogQuery = ex
    .select()
    .from(catalogItems)
    .where(eq(catalogItems.businessId, businessId));
  // Inside the reactivation, keep a bulk increase from changing prices until it commits.
  const catalog = lockCatalog ? await catalogQuery.for("share") : await catalogQuery;
  const repriced = repriceFromCatalog(live.items, catalog, live.currency);
  let totalCents: number;
  try {
    totalCents = computeTotals({
      lines: repriced.items,
      discount: live.discount,
      vatMode: live.vatMode,
    }).totalCents;
  } catch {
    throw new QuoteError("Los montos son demasiado grandes.");
  }
  return {
    ...repriced,
    live,
    validUntil: addDays(todayInArgentina(now), business.defaultValidityDays),
    totalCents,
  };
}

/** What reactivating an expired quote would change: current catalog prices and a new validity. */
export async function previewReactivation(db: Db, businessId: string, quoteId: string, now: Date) {
  const detail = await getQuote(db, businessId, quoteId);
  if (!detail) return null;
  return repriceVersion(db, businessId, liveVersion(detail.versions)!, now);
}

/**
 * Everything is read again after locking the quote, so the new version is built from the version
 * and prices that are current when it commits, not from what the preview saw.
 */
export async function reactivateQuote(db: Db, businessId: string, quoteId: string, now: Date) {
  return db.transaction(async (tx) => {
    const { quote, versions, latest } = await lockQuote(tx, businessId, quoteId);
    const live = liveVersion(versions)!;
    const status = transition(
      { status: quote.status, validUntil: live.validUntil },
      "reactivate",
      now,
    );
    const next = await repriceVersion(tx, businessId, live, now, true);
    const version = latest.version + 1;
    await tx.insert(quoteVersions).values({
      ...contentOf(live),
      quoteId: quote.id,
      version,
      items: next.items,
      totalCents: next.totalCents,
      validUntil: next.validUntil,
      sentAt: now,
      createdAt: now,
    });
    await tx.update(quotes).set({ status }).where(eq(quotes.id, quote.id));
    await event(tx, quote.id, "reactivated", now, version);
  });
}

export async function getQuote(db: Db, businessId: string, quoteId: string) {
  if (!isUuid(quoteId)) return null;
  const [quote] = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.businessId, businessId), eq(quotes.id, quoteId)));
  if (!quote) return null;
  const [versions, events] = await Promise.all([
    db
      .select()
      .from(quoteVersions)
      .where(eq(quoteVersions.quoteId, quote.id))
      .orderBy(asc(quoteVersions.version)),
    db
      .select()
      .from(quoteEvents)
      .where(eq(quoteEvents.quoteId, quote.id))
      .orderBy(asc(quoteEvents.createdAt)),
  ]);
  return { quote, versions, events };
}

export interface QuoteListRow {
  id: string;
  number: number;
  status: QuoteStatus;
  displayStatus: DisplayStatus;
  clientName: string;
  currency: "ARS" | "USD";
  totalCents: number;
  validUntil: string;
  firstSentAt: Date | null;
  respondedAt: Date | null;
  createdAt: Date;
}

/**
 * One row per quote with its live version. The live version is picked first and the filters apply
 * to it, so a search never matches an older version's client.
 */
export async function listQuotes(
  db: Db,
  businessId: string,
  now: Date,
  filter: { status?: DisplayStatus; search?: string } = {},
): Promise<QuoteListRow[]> {
  const search = filter.search?.trim();
  const live = db
    .selectDistinctOn([quoteVersions.quoteId], {
      quoteId: quoteVersions.quoteId,
      clientName: sql<string>`${quoteVersions.client}->>'name'`.as("client_name"),
      currency: quoteVersions.currency,
      totalCents: quoteVersions.totalCents,
      validUntil: quoteVersions.validUntil,
    })
    .from(quoteVersions)
    .innerJoin(quotes, eq(quotes.id, quoteVersions.quoteId))
    .where(eq(quotes.businessId, businessId))
    .orderBy(
      quoteVersions.quoteId,
      sql`${quoteVersions.sentAt} is null`,
      desc(quoteVersions.version),
    )
    .as("live");
  const rows = await db
    .select({
      id: quotes.id,
      number: quotes.number,
      status: quotes.status,
      firstSentAt: quotes.firstSentAt,
      respondedAt: quotes.respondedAt,
      createdAt: quotes.createdAt,
      clientName: live.clientName,
      currency: live.currency,
      totalCents: live.totalCents,
      validUntil: live.validUntil,
    })
    .from(live)
    .innerJoin(quotes, eq(quotes.id, live.quoteId))
    .where(search ? sql`${live.clientName} ilike ${likePattern(search)}` : undefined);

  return rows
    .map((r) => ({ ...r, displayStatus: displayStatus(r, now) }))
    .filter((r) => !filter.status || r.displayStatus === filter.status)
    .sort((a, b) => b.number - a.number);
}
