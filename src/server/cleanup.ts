import { and, eq, lt } from "drizzle-orm";
import { config } from "@/config";
import type { Db } from "@/db";
import { rateLimits, user } from "@/db/schema";

const longestWindowMs =
  Math.max(...Object.values(config.rateLimits).map((r) => r.windowSeconds)) * 1000;

export const guestCutoff = (now: Date) =>
  new Date(now.getTime() - config.guestAccountTtlHours * 3600_000);

/** Guest accounts stop working once they are older than the TTL, even before they are deleted. */
export const isExpiredGuest = (u: { isAnonymous?: boolean | null; createdAt: Date }, now: Date) =>
  !!u.isAnonymous && u.createdAt < guestCutoff(now);

/**
 * Deletes guest accounts past their TTL (their business, quotes and sessions go with them) and
 * rate-limit windows that already ended, so IP addresses are not kept longer than needed.
 */
export async function purgeExpired(db: Db, now: Date) {
  const guests = await db
    .delete(user)
    .where(and(eq(user.isAnonymous, true), lt(user.createdAt, guestCutoff(now))))
    .returning({ id: user.id });
  const windows = await db
    .delete(rateLimits)
    .where(lt(rateLimits.windowStart, new Date(now.getTime() - longestWindowMs)))
    .returning({ key: rateLimits.key });
  return { guests: guests.length, rateLimits: windows.length };
}
