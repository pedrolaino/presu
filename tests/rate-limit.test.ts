import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { allowRequest } from "@/server/rate-limit";

const rule = { limit: 2, windowSeconds: 60 };

describe("allowRequest", () => {
  it("allows up to the limit within a window, then resets", async () => {
    const key = `test:${crypto.randomUUID()}`;
    const t0 = new Date("2026-01-01T00:00:00Z");
    const at = (s: number) => new Date(t0.getTime() + s * 1000);

    expect(await allowRequest(db, key, rule, at(0))).toBe(true);
    expect(await allowRequest(db, key, rule, at(10))).toBe(true);
    expect(await allowRequest(db, key, rule, at(20))).toBe(false);
    expect(await allowRequest(db, key, rule, at(61))).toBe(true);
    expect(await allowRequest(db, key, rule, at(62))).toBe(true);
    expect(await allowRequest(db, key, rule, at(63))).toBe(false);
  });

  it("counts concurrent hits atomically", async () => {
    const key = `test:${crypto.randomUUID()}`;
    const now = new Date();
    const results = await Promise.all(
      Array.from({ length: 10 }, () => allowRequest(db, key, { limit: 3, windowSeconds: 60 }, now)),
    );
    expect(results.filter(Boolean)).toHaveLength(3);
  });
});
