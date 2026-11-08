import { sql } from "drizzle-orm";
import type { RateLimitRule } from "@/config";
import type { Db } from "@/db";
import { rateLimits } from "@/db/schema";

/** Counts one hit for `key` and returns whether it is still within the limit. */
export async function allowRequest(db: Db, key: string, rule: RateLimitRule, now: Date) {
  const windowStart = new Date(now.getTime() - rule.windowSeconds * 1000);
  const expired = sql`${rateLimits.windowStart} <= ${windowStart.toISOString()}`;
  const [row] = await db
    .insert(rateLimits)
    .values({ key, count: 1, windowStart: now })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${expired} then 1 else ${rateLimits.count} + 1 end`,
        windowStart: sql`case when ${expired} then ${now.toISOString()}::timestamptz else ${rateLimits.windowStart} end`,
      },
    })
    .returning({ count: rateLimits.count });
  return row.count <= rule.limit;
}
