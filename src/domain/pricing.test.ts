import { describe, expect, it } from "vitest";
import { increasePrice, previewIncrease } from "./pricing";

describe("increasePrice", () => {
  it("applies a percentage rounding half up to the cent", () => {
    expect(increasePrice(100_000, 1000)).toBe(110_000); // +10%
    expect(increasePrice(999, 1250)).toBe(1124); // 1123.875
    expect(increasePrice(10, 500)).toBe(11); // 10.5
    expect(increasePrice(0, 5000)).toBe(0);
  });

  it("supports decreases above -100%", () => {
    expect(increasePrice(100_000, -2500)).toBe(75_000);
    expect(() => increasePrice(100, -10_000)).toThrow(RangeError);
  });
});

describe("previewIncrease", () => {
  it("lists old and new price for each item", () => {
    expect(
      previewIncrease(
        [
          { id: "1", name: "Caño", priceCents: 2_000 },
          { id: "2", name: "Codo", priceCents: 333 },
        ],
        1500,
      ),
    ).toEqual([
      { id: "1", name: "Caño", beforeCents: 2_000, afterCents: 2_300 },
      { id: "2", name: "Codo", beforeCents: 333, afterCents: 383 }, // 382.95
    ]);
  });
});
