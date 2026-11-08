import { describe, expect, it } from "vitest";
import {
  acceptanceRate,
  acceptedByMonth,
  averageResponseMs,
  expiringSoon,
  type MetricsQuote,
} from "./metrics";

const now = new Date("2026-06-10T15:00:00Z");
const q = (over: Partial<MetricsQuote>): MetricsQuote => ({
  status: "sent",
  validUntil: "2026-06-30",
  currency: "ARS",
  totalCents: 0,
  sentAt: new Date("2026-06-01T12:00:00Z"),
  respondedAt: null,
  ...over,
});

describe("acceptanceRate", () => {
  it("is accepted over closed quotes (accepted, rejected or expired)", () => {
    const quotes = [
      q({ status: "accepted" }),
      q({ status: "accepted" }),
      q({ status: "rejected" }),
      q({ status: "viewed", validUntil: "2026-06-01" }), // expired
      q({ status: "sent" }), // still open, not counted
      q({ status: "draft", sentAt: null }),
    ];
    expect(acceptanceRate(quotes, now)).toBe(0.5);
  });

  it("is null when nothing has closed", () => {
    expect(acceptanceRate([q({})], now)).toBeNull();
  });
});

describe("averageResponseMs", () => {
  it("averages time from sending to the client's answer", () => {
    const quotes = [
      q({ status: "accepted", respondedAt: new Date("2026-06-02T12:00:00Z") }), // 1 day
      q({ status: "rejected", respondedAt: new Date("2026-06-04T12:00:00Z") }), // 3 days
      q({ status: "viewed" }),
    ];
    expect(averageResponseMs(quotes)).toBe(2 * 24 * 3600 * 1000);
  });

  it("is null without answers", () => {
    expect(averageResponseMs([q({})])).toBeNull();
  });
});

describe("expiringSoon", () => {
  it("lists open quotes whose last valid day is within the next 7 days", () => {
    const quotes = [
      q({ validUntil: "2026-06-10" }), // today
      q({ validUntil: "2026-06-17", status: "viewed" }), // day 7
      q({ validUntil: "2026-06-18" }), // day 8
      q({ validUntil: "2026-06-09" }), // already expired
      q({ validUntil: "2026-06-12", status: "accepted" }),
      q({ validUntil: "2026-06-12", status: "draft" }),
    ];
    expect(expiringSoon(quotes, now).map((x) => x.validUntil)).toEqual([
      "2026-06-10",
      "2026-06-17",
    ]);
  });
});

describe("acceptedByMonth", () => {
  it("sums accepted totals per month and currency, in Argentina time", () => {
    const quotes = [
      q({ status: "accepted", totalCents: 1_000, respondedAt: new Date("2026-05-31T23:00:00Z") }), // May 31, 20:00 AR
      q({ status: "accepted", totalCents: 2_000, respondedAt: new Date("2026-06-01T02:00:00Z") }), // May 31, 23:00 AR
      q({
        status: "accepted",
        totalCents: 500,
        currency: "USD",
        respondedAt: new Date("2026-06-01T04:00:00Z"),
      }),
      q({ status: "accepted", totalCents: 700, respondedAt: new Date("2026-06-05T12:00:00Z") }),
      q({ status: "rejected", totalCents: 9_999, respondedAt: new Date("2026-06-05T12:00:00Z") }),
    ];
    expect(acceptedByMonth(quotes)).toEqual([
      { month: "2026-05", ARS: 3_000, USD: 0 },
      { month: "2026-06", ARS: 700, USD: 500 },
    ]);
  });
});
