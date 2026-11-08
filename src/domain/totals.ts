// Money is integer cents, quantities are integer hundredths (2.5 m² = 250), rates are basis points (21% = 2100).
// Rounding rule: every division rounds half up to the nearest cent, once per line (subtotal),
// once for a percent discount and once per VAT rate. Discount shares per rate use largest remainder
// so they always add up to the discount exactly.

export type VatMode = "none" | "included" | "added";

export type Discount = { kind: "percent"; bps: number } | { kind: "amount"; cents: number } | null;

export interface LineInput {
  quantityHundredths: number;
  unitPriceCents: number;
  vatRateBps: number;
}

export interface VatGroup {
  rateBps: number;
  baseCents: number;
  vatCents: number;
}

export interface Totals {
  lineSubtotals: number[];
  subtotalCents: number;
  discountCents: number;
  vatBreakdown: VatGroup[];
  vatCents: number;
  totalCents: number;
}

/** a / b rounded half up, for non-negative a and positive b. */
export function roundDiv(a: bigint, b: bigint): bigint {
  return (2n * a + b) / (2n * b);
}

function toSafe(n: bigint): number {
  if (n > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError("Amount too large");
  return Number(n);
}

function lineSubtotalBig(line: LineInput): bigint {
  return roundDiv(BigInt(line.quantityHundredths) * BigInt(line.unitPriceCents), 100n);
}

export function lineSubtotal(line: LineInput): number {
  return toSafe(lineSubtotalBig(line));
}

export function computeTotals(input: {
  lines: LineInput[];
  discount: Discount;
  vatMode: VatMode;
}): Totals {
  const subtotals = input.lines.map(lineSubtotalBig);
  const subtotal = subtotals.reduce((s, v) => s + v, 0n);

  let discount = 0n;
  if (input.discount?.kind === "percent") {
    discount = roundDiv(subtotal * BigInt(input.discount.bps), 10_000n);
  } else if (input.discount?.kind === "amount") {
    discount = BigInt(input.discount.cents);
  }
  if (discount > subtotal) discount = subtotal;

  const vatBreakdown: { rateBps: number; base: bigint; vat: bigint }[] = [];
  if (input.vatMode === "added") {
    const byRate = new Map<number, bigint>();
    input.lines.forEach((l, i) =>
      byRate.set(l.vatRateBps, (byRate.get(l.vatRateBps) ?? 0n) + subtotals[i]),
    );
    const groups = [...byRate.entries()].sort((a, b) => b[0] - a[0]);

    // Split the discount proportionally; leftover cents go to the largest remainders (ties: higher rate).
    const divisor = subtotal === 0n ? 1n : subtotal;
    const shares = groups.map(([, gross]) => discount * gross);
    const allocated = shares.map((s) => s / divisor);
    let leftover = discount - allocated.reduce((s, v) => s + v, 0n);
    const byRemainder = groups
      .map((_, i) => i)
      .sort((a, b) => {
        const diff = (shares[b] % divisor) - (shares[a] % divisor);
        return diff === 0n ? a - b : diff > 0n ? 1 : -1;
      });
    for (const i of byRemainder) {
      if (leftover === 0n) break;
      allocated[i] += 1n;
      leftover -= 1n;
    }

    groups.forEach(([rateBps, gross], i) => {
      const base = gross - allocated[i];
      vatBreakdown.push({ rateBps, base, vat: roundDiv(base * BigInt(rateBps), 10_000n) });
    });
  }

  const vat = vatBreakdown.reduce((s, g) => s + g.vat, 0n);
  return {
    lineSubtotals: subtotals.map(toSafe),
    subtotalCents: toSafe(subtotal),
    discountCents: toSafe(discount),
    vatBreakdown: vatBreakdown.map((g) => ({
      rateBps: g.rateBps,
      baseCents: toSafe(g.base),
      vatCents: toSafe(g.vat),
    })),
    vatCents: toSafe(vat),
    totalCents: toSafe(subtotal - discount + vat),
  };
}
