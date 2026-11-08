import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { businesses, rateLimits, user } from "@/db/schema";
import { getPublicQuote } from "@/server/data/public";
import { createQuote, markSent, quoteInput } from "@/server/data/quotes";
import { createClient } from "@/server/data/clients";
import { purgeExpired } from "@/server/cleanup";

const now = new Date("2026-04-10T15:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000);
const random = (n: number) => crypto.getRandomValues(new Uint8Array(n));

async function guest(createdAt: Date) {
  const id = crypto.randomUUID();
  await db
    .insert(user)
    .values({ id, name: "Invitado", email: `${id}@guest.invalid`, isAnonymous: true, createdAt });
  const [business] = await db.insert(businesses).values({ userId: id, name: "Demo" }).returning();
  return { id, business };
}

async function sharedQuote(businessId: string) {
  const clientId = await createClient(db, businessId, {
    name: "Cliente",
    email: "",
    phone: "",
    address: "",
  });
  const input = quoteInput.parse({
    client: { kind: "existing", id: clientId },
    items: [
      {
        catalogItemId: null,
        name: "Trabajo",
        unit: "u",
        quantity: "1",
        unitPrice: "1000",
        vatRateBps: "2100",
      },
    ],
    discount: { kind: "none", value: "" },
    vatMode: "added",
    currency: "ARS",
    validUntil: "2026-04-25",
    notes: "",
    terms: "",
  });
  const q = await createQuote(db, businessId, input, hoursAgo(30), random);
  return (await markSent(db, businessId, q.id, hoursAgo(30)))!;
}

describe("guest expiry", () => {
  it("hides an expired guest's links and the purge deletes the account", async () => {
    const old = await guest(hoursAgo(25));
    const fresh = await guest(hoursAgo(1));
    const token = await sharedQuote(old.business.id);

    expect(await getPublicQuote(db, token, now)).toBeNull();
    expect(await getPublicQuote(db, token, hoursAgo(20))).not.toBeNull();

    await purgeExpired(db, now);
    expect(await db.select().from(user).where(eq(user.id, old.id))).toHaveLength(0);
    expect(await db.select().from(user).where(eq(user.id, fresh.id))).toHaveLength(1);
  });
});

describe("rate-limit purge", () => {
  it("deletes windows that ended and keeps current ones", async () => {
    const stale = `test:${crypto.randomUUID()}`;
    const current = `test:${crypto.randomUUID()}`;
    await db.insert(rateLimits).values([
      { key: stale, count: 1, windowStart: hoursAgo(2) },
      { key: current, count: 1, windowStart: hoursAgo(0.5) },
    ]);
    await purgeExpired(db, now);
    const keys = (await db.select().from(rateLimits)).map((r) => r.key);
    expect(keys).not.toContain(stale);
    expect(keys).toContain(current);
  });
});
