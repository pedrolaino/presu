import { describe, expect, it } from "vitest";
import { computeTotals, lineSubtotal, roundDiv } from "./totals";

const line = (quantity: number, unitPriceCents: number, vatRateBps = 2100) => ({
  quantityHundredths: Math.round(quantity * 100),
  unitPriceCents,
  vatRateBps,
});

describe("roundDiv", () => {
  it("rounds half up", () => {
    expect(roundDiv(5n, 10n)).toBe(1n);
    expect(roundDiv(4n, 10n)).toBe(0n);
    expect(roundDiv(15n, 10n)).toBe(2n);
    expect(roundDiv(25n, 10n)).toBe(3n);
    expect(roundDiv(0n, 10n)).toBe(0n);
  });
});

describe("lineSubtotal", () => {
  it("multiplies decimal quantities without float drift", () => {
    expect(lineSubtotal(line(2.5, 100_000))).toBe(250_000);
    expect(lineSubtotal(line(0.1, 3))).toBe(0); // 0.3 cents
    expect(lineSubtotal(line(0.5, 1))).toBe(1); // 0.5 cents rounds up
    expect(lineSubtotal(line(1.5, 3))).toBe(5); // 4.5 cents rounds up
    expect(lineSubtotal(line(0.07, 100))).toBe(7);
  });

  it("keeps large products exact", () => {
    // 999,999.99 x $99,999.99 = 9,999,998,900,000.0001 cents
    expect(lineSubtotal(line(999_999.99, 9_999_999))).toBe(9_999_998_900_000);
  });

  it("refuses amounts that cannot be represented exactly", () => {
    expect(() => lineSubtotal(line(999_999.99, 99_999_999_999))).toThrow(RangeError);
  });
});

describe("computeTotals", () => {
  it("returns zeros for an empty quote", () => {
    expect(computeTotals({ lines: [], discount: null, vatMode: "added" })).toEqual({
      lineSubtotals: [],
      subtotalCents: 0,
      discountCents: 0,
      vatBreakdown: [],
      vatCents: 0,
      totalCents: 0,
    });
  });

  it("vat mode none ignores rates", () => {
    const t = computeTotals({
      lines: [line(2, 1000), line(1, 500, 1050)],
      discount: null,
      vatMode: "none",
    });
    expect(t.subtotalCents).toBe(2500);
    expect(t.vatBreakdown).toEqual([]);
    expect(t.totalCents).toBe(2500);
  });

  it("vat mode included shows final prices without breakdown", () => {
    const t = computeTotals({
      lines: [line(1, 12_100)],
      discount: { kind: "percent", bps: 1000 },
      vatMode: "included",
    });
    expect(t.discountCents).toBe(1210);
    expect(t.vatBreakdown).toEqual([]);
    expect(t.vatCents).toBe(0);
    expect(t.totalCents).toBe(10_890);
  });

  it("vat mode added breaks down by rate, highest first", () => {
    const t = computeTotals({
      lines: [line(1, 10_000, 2100), line(2, 5_000, 1050), line(1, 1_000, 2700), line(1, 300, 0)],
      discount: null,
      vatMode: "added",
    });
    expect(t.subtotalCents).toBe(21_300);
    expect(t.vatBreakdown).toEqual([
      { rateBps: 2700, baseCents: 1_000, vatCents: 270 },
      { rateBps: 2100, baseCents: 10_000, vatCents: 2_100 },
      { rateBps: 1050, baseCents: 10_000, vatCents: 1_050 },
      { rateBps: 0, baseCents: 300, vatCents: 0 },
    ]);
    expect(t.vatCents).toBe(3_420);
    expect(t.totalCents).toBe(24_720);
  });

  it("applies the discount before vat, split across rates so bases add up exactly", () => {
    const t = computeTotals({
      lines: [line(1, 100, 2100), line(1, 100, 1050), line(1, 100, 0)],
      discount: { kind: "amount", cents: 100 },
      vatMode: "added",
    });
    // 100 / 3 = 33.33 each; the leftover cent goes to the highest rate on ties
    expect(t.vatBreakdown.map((g) => g.baseCents)).toEqual([66, 67, 67]);
    expect(t.vatBreakdown.reduce((s, g) => s + g.baseCents, 0)).toBe(200);
    expect(t.vatBreakdown.map((g) => g.vatCents)).toEqual([14, 7, 0]); // 13.86 -> 14, 7.035 -> 7
    expect(t.totalCents).toBe(200 + 21);
  });

  it("rounds percent discounts half up", () => {
    const t = computeTotals({
      lines: [line(1, 10)],
      discount: { kind: "percent", bps: 1500 },
      vatMode: "none",
    });
    expect(t.discountCents).toBe(2); // 1.5 cents
    expect(t.totalCents).toBe(8);
  });

  it("caps fixed discounts at the subtotal", () => {
    const t = computeTotals({
      lines: [line(1, 500)],
      discount: { kind: "amount", cents: 900 },
      vatMode: "added",
    });
    expect(t.discountCents).toBe(500);
    expect(t.vatCents).toBe(0);
    expect(t.totalCents).toBe(0);
  });

  it("a 100% discount leaves nothing to tax", () => {
    const t = computeTotals({
      lines: [line(3, 999)],
      discount: { kind: "percent", bps: 10_000 },
      vatMode: "added",
    });
    expect(t.totalCents).toBe(0);
  });

  it("rounds vat once per rate, not per line", () => {
    // per line: 7 * 0.21 = 1.47 -> 1, three times = 3; per rate: 21 * 0.21 = 4.41 -> 4
    const t = computeTotals({
      lines: [line(1, 7), line(1, 7), line(1, 7)],
      discount: null,
      vatMode: "added",
    });
    expect(t.vatCents).toBe(4);
    expect(t.totalCents).toBe(25);
  });
});
