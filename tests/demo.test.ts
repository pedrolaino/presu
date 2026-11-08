import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { businesses, user } from "@/db/schema";
import { listQuotes } from "@/server/data/quotes";
import { seedDemo } from "@/server/demo";

describe("seedDemo", () => {
  it("creates quotes in every state, consistent with today's date", async () => {
    const userId = crypto.randomUUID();
    await db.insert(user).values({
      id: userId,
      name: "Invitado",
      email: `${userId}@guest.invalid`,
      isAnonymous: true,
    });
    const now = new Date("2026-11-08T15:00:00Z");
    await seedDemo(db, userId, now);

    const [business] = await db.select().from(businesses).where(eq(businesses.userId, userId));
    const rows = await listQuotes(db, business.id, now);
    const statuses = new Set(rows.map((r) => r.displayStatus));
    expect([...statuses].sort()).toEqual([
      "accepted",
      "draft",
      "expired",
      "rejected",
      "sent",
      "viewed",
    ]);
    expect(rows.map((r) => r.number).sort((a, b) => a - b)).toEqual(rows.map((_, i) => i + 1));
    expect(rows.some((r) => r.currency === "USD")).toBe(true);
  });
});
