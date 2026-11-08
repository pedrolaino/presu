import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { quotes } from "@/db/schema";
import { InvalidTransitionError } from "@/domain/status";
import { createCatalogItem } from "@/server/data/catalog";
import { createClient } from "@/server/data/clients";
import {
  createQuote,
  duplicateQuote,
  getQuote,
  listQuotes,
  markSent,
  previewReactivation,
  quoteInput,
  reactivateQuote,
  setShareLink,
  updateQuote,
  type QuoteInput,
} from "@/server/data/quotes";
import { updateCatalogItem } from "@/server/data/catalog";
import { createBusiness } from "./helpers";

const now = new Date("2026-04-10T15:00:00Z");
const later = (days: number) => new Date(now.getTime() + days * 86_400_000);
const random = (n: number) => crypto.getRandomValues(new Uint8Array(n));

function input(clientId: string, over: Record<string, unknown> = {}): QuoteInput {
  return quoteInput.parse({
    client: { kind: "existing", id: clientId },
    items: [
      {
        catalogItemId: null,
        name: "Mano de obra",
        unit: "hora",
        quantity: "2,5",
        unitPrice: "28000",
        vatRateBps: "2100",
      },
    ],
    discount: { kind: "none", value: "" },
    vatMode: "added",
    currency: "ARS",
    validUntil: "2026-04-25",
    notes: "",
    terms: "",
    ...over,
  });
}

let business: { id: string };
let clientId: string;

beforeAll(async () => {
  business = await createBusiness();
  clientId = await createClient(db, business.id, {
    name: "Laura Fernández",
    email: "",
    phone: "",
    address: "",
  });
});

describe("numbering", () => {
  it("never repeats a number, even when quotes are created at the same time", async () => {
    const b = await createBusiness();
    const c = await createClient(db, b.id, { name: "Cliente", email: "", phone: "", address: "" });
    const created = await Promise.all(
      Array.from({ length: 25 }, () => createQuote(db, b.id, input(c), now, random)),
    );
    const numbers = created.map((q) => q.number).sort((x, y) => x - y);
    expect(numbers).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
  });

  it("numbers each business on its own", async () => {
    const b = await createBusiness();
    const c = await createClient(db, b.id, { name: "Cliente", email: "", phone: "", address: "" });
    expect((await createQuote(db, b.id, input(c), now, random)).number).toBe(1);
  });
});

describe("creating", () => {
  it("stores totals and a client snapshot, and can create the client on the spot", async () => {
    const q = await createQuote(
      db,
      business.id,
      input(clientId, {
        client: { kind: "new", data: { name: "Diego Romero", email: "", phone: "", address: "" } },
      }),
      now,
      random,
    );
    const detail = (await getQuote(db, business.id, q.id))!;
    expect(detail.quote.status).toBe("draft");
    expect(detail.versions[0].client.name).toBe("Diego Romero");
    expect(detail.versions[0].totalCents).toBe(8_470_000); // 70.000 + 21%
    expect(detail.events.map((e) => e.type)).toEqual(["created"]);
  });

  it("drops links to another business's catalog items", async () => {
    const other = await createBusiness();
    const foreign = await createCatalogItem(db, other.id, {
      name: "x",
      description: "",
      unit: "u",
      priceCents: 1,
      currency: "ARS",
      vatRateBps: 0,
      category: "",
      active: true,
    });
    const items = [
      {
        catalogItemId: foreign,
        name: "x",
        unit: "u",
        quantity: "1",
        unitPrice: "1",
        vatRateBps: "0",
      },
    ];
    const q = await createQuote(db, business.id, input(clientId, { items }), now, random);
    expect((await getQuote(db, business.id, q.id))!.versions[0].items[0].catalogItemId).toBeNull();
  });
});

describe("versions", () => {
  it("edits drafts in place and adds a version once sent", async () => {
    const q = await createQuote(db, business.id, input(clientId), now, random);
    await updateQuote(db, business.id, q.id, input(clientId, { notes: "borrador" }), now);
    expect((await getQuote(db, business.id, q.id))!.versions).toHaveLength(1);

    await markSent(db, business.id, q.id, now);
    await updateQuote(db, business.id, q.id, input(clientId, { notes: "v2" }), later(1));
    await updateQuote(db, business.id, q.id, input(clientId, { notes: "v2 corregida" }), later(1));
    const detail = (await getQuote(db, business.id, q.id))!;
    expect(detail.versions.map((v) => [v.version, v.notes, v.sentAt !== null])).toEqual([
      [1, "borrador", true],
      [2, "v2 corregida", false],
    ]);
    expect(detail.events.map((e) => e.type)).toEqual(["created", "sent", "new_version"]);
  });

  it("never edits an accepted quote", async () => {
    const q = await createQuote(db, business.id, input(clientId), now, random);
    await markSent(db, business.id, q.id, now);
    await db.update(quotes).set({ status: "accepted" }).where(eq(quotes.id, q.id));
    await expect(updateQuote(db, business.id, q.id, input(clientId), now)).rejects.toThrow(
      InvalidTransitionError,
    );
  });
});

describe("sending", () => {
  it("records the event once and returns the link created with the quote", async () => {
    const q = await createQuote(db, business.id, input(clientId), now, random);
    const token = (await getQuote(db, business.id, q.id))!.quote.shareToken;
    expect(token).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(await markSent(db, business.id, q.id, now)).toBe(token);
    expect(await markSent(db, business.id, q.id, later(1))).toBe(token);
    const detail = (await getQuote(db, business.id, q.id))!;
    expect(detail.quote.status).toBe("sent");
    expect(detail.quote.firstSentAt).toEqual(now);
    expect(detail.events.filter((e) => e.type === "sent")).toHaveLength(1);
  });

  it("refuses to send a version whose validity already passed", async () => {
    const q = await createQuote(
      db,
      business.id,
      input(clientId, { validUntil: "2026-04-01" }),
      now,
      random,
    );
    await expect(markSent(db, business.id, q.id, now)).rejects.toThrow(InvalidTransitionError);
  });

  it("revokes and regenerates the link; sending does not bring a revoked link back", async () => {
    const q = await createQuote(db, business.id, input(clientId), now, random);
    const token = await markSent(db, business.id, q.id, now);
    expect(await setShareLink(db, business.id, q.id, null)).toBe(true);
    await updateQuote(db, business.id, q.id, input(clientId, { notes: "v2" }), now);
    expect(await markSent(db, business.id, q.id, now)).toBeNull();
    expect(await setShareLink(db, business.id, q.id, random)).toBe(true);
    const regenerated = (await getQuote(db, business.id, q.id))!.quote.shareToken;
    expect(regenerated).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(regenerated).not.toBe(token);
  });
});

describe("duplicate and reactivate", () => {
  it("duplicates as a new draft with a new number and fresh validity", async () => {
    const q = await createQuote(db, business.id, input(clientId), now, random);
    const copyId = await duplicateQuote(db, business.id, q.id, later(30), random);
    const copy = (await getQuote(db, business.id, copyId))!;
    expect(copy.quote.status).toBe("draft");
    expect(copy.quote.number).toBeGreaterThan(q.number);
    expect(copy.versions[0].validUntil).toBe("2026-05-25"); // May 10 + 15 days
  });

  it("reactivates an expired quote with current catalog prices", async () => {
    const itemId = await createCatalogItem(db, business.id, {
      name: "Toma",
      description: "",
      unit: "u",
      priceCents: 1_000_000,
      currency: "ARS",
      vatRateBps: 2100,
      category: "",
      active: true,
    });
    const items = [
      {
        catalogItemId: itemId,
        name: "Toma",
        unit: "u",
        quantity: "2",
        unitPrice: "10000",
        vatRateBps: "2100",
      },
    ];
    const q = await createQuote(db, business.id, input(clientId, { items }), now, random);
    await markSent(db, business.id, q.id, now);
    await expect(reactivateQuote(db, business.id, q.id, now)).rejects.toThrow(
      InvalidTransitionError,
    );

    await updateCatalogItem(db, business.id, itemId, {
      name: "Toma",
      description: "",
      unit: "u",
      priceCents: 1_200_000,
      currency: "ARS",
      vatRateBps: 2100,
      category: "",
      active: true,
    });
    const afterExpiry = later(20);
    const preview = (await previewReactivation(db, business.id, q.id, afterExpiry))!;
    expect(preview.changes).toEqual([
      { name: "Toma", beforeCents: 1_000_000, afterCents: 1_200_000 },
    ]);

    await reactivateQuote(db, business.id, q.id, afterExpiry);
    const detail = (await getQuote(db, business.id, q.id))!;
    expect(detail.quote.status).toBe("sent");
    expect(detail.versions).toHaveLength(2);
    expect(detail.versions[1].items[0].unitPriceCents).toBe(1_200_000);
    expect(detail.versions[1].validUntil).toBe("2026-05-15");
    expect(detail.versions[1].sentAt).toEqual(afterExpiry);
    expect(detail.events.at(-1)?.type).toBe("reactivated");
  });
});

describe("listing", () => {
  it("shows each quote once with its live version and filters by derived status and client", async () => {
    const b = await createBusiness();
    const c = await createClient(db, b.id, {
      name: "Panadería La Espiga",
      email: "",
      phone: "",
      address: "",
    });
    const sent = await createQuote(db, b.id, input(c), now, random);
    await markSent(db, b.id, sent.id, now);
    await updateQuote(db, b.id, sent.id, input(c, { validUntil: "2026-06-30" }), now); // unsent v2
    await createQuote(db, b.id, input(c), now, random);

    const all = await listQuotes(db, b.id, later(20));
    expect(all.map((r) => [r.number, r.displayStatus])).toEqual([
      [2, "draft"],
      [1, "expired"], // the client still sees v1, which expired
    ]);
    expect(await listQuotes(db, b.id, later(20), { status: "expired" })).toHaveLength(1);
    expect(await listQuotes(db, b.id, now, { search: "espiga" })).toHaveLength(2);
    expect(await listQuotes(db, b.id, now, { search: "%" })).toHaveLength(0);
  });

  it("searches the live version's client, not an older version's", async () => {
    const b = await createBusiness();
    const client = (name: string) =>
      createClient(db, b.id, { name, email: "", phone: "", address: "" });
    const ana = await client("Ana Pérez");
    const bruno = await client("Bruno Díaz");
    const q = await createQuote(db, b.id, input(ana), now, random);
    await markSent(db, b.id, q.id, now);
    await updateQuote(db, b.id, q.id, input(bruno), now);
    await markSent(db, b.id, q.id, now);

    expect(await listQuotes(db, b.id, now, { search: "ana" })).toHaveLength(0);
    const [row] = await listQuotes(db, b.id, now, { search: "bruno" });
    expect(row.clientName).toBe("Bruno Díaz");
  });
});

describe("isolation", () => {
  it("another business cannot read, edit, send, copy or reactivate a quote", async () => {
    const q = await createQuote(db, business.id, input(clientId), now, random);
    const other = await createBusiness();
    const otherClient = await createClient(db, other.id, {
      name: "X",
      email: "",
      phone: "",
      address: "",
    });

    expect(await getQuote(db, other.id, q.id)).toBeNull();
    expect((await listQuotes(db, other.id, now)).map((r) => r.id)).not.toContain(q.id);
    await expect(updateQuote(db, other.id, q.id, input(otherClient), now)).rejects.toThrow();
    await expect(markSent(db, other.id, q.id, now)).rejects.toThrow();
    await expect(duplicateQuote(db, other.id, q.id, now, random)).rejects.toThrow();
    await expect(reactivateQuote(db, other.id, q.id, later(30))).rejects.toThrow();
    expect(await setShareLink(db, other.id, q.id, null)).toBe(false);
    // and cannot attach someone else's client to its own quote
    await expect(createQuote(db, other.id, input(clientId), now, random)).rejects.toThrow(
      "Elegí un cliente.",
    );
    expect((await getQuote(db, business.id, q.id))!.quote.status).toBe("draft");
  });
});
