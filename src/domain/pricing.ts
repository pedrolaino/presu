import { roundDiv } from "./totals";

/** Applies a percentage change in basis points (+10% = 1000), rounding half up to the cent. */
export function increasePrice(priceCents: number, percentBps: number): number {
  if (percentBps <= -10_000) throw new RangeError("A decrease must be smaller than 100%");
  return Number(roundDiv(BigInt(priceCents) * BigInt(10_000 + percentBps), 10_000n));
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
