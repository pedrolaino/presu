import { roundDiv } from "./totals";

/** Largest price the forms accept (12 whole digits and 2 decimals); it is also below MAX_SAFE_INTEGER. */
export const MAX_PRICE_CENTS = 99_999_999_999_999;

export class PriceTooLargeError extends RangeError {}

/**
 * Applies a percentage change in basis points (+10% = 1000), rounding half up to the cent.
 * Throws PriceTooLargeError instead of returning a price the forms could not save again.
 */
export function increasePrice(priceCents: number, percentBps: number): number {
  if (percentBps <= -10_000) throw new RangeError("A decrease must be smaller than 100%");
  const result = roundDiv(BigInt(priceCents) * BigInt(10_000 + percentBps), 10_000n);
  if (result > BigInt(MAX_PRICE_CENTS)) throw new PriceTooLargeError("Price too large");
  return Number(result);
}

export function previewIncrease<T extends { id: string; name: string; priceCents: number }>(
  items: T[],
  percentBps: number,
) {
  return items.map((i) => ({
    id: i.id,
    name: i.name,
    beforeCents: i.priceCents,
    afterCents: increasePrice(i.priceCents, percentBps),
  }));
}
