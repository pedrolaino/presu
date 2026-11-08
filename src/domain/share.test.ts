import { describe, expect, it } from "vitest";
import { formatQuoteNumber, newShareToken } from "./share";

describe("newShareToken", () => {
  it("encodes 24 random bytes (192 bits) as url-safe text", () => {
    const token = newShareToken((n) => new Uint8Array(n).fill(255));
    expect(token).toBe("_".repeat(32));
    expect(newShareToken((n) => new Uint8Array(n))).toMatch(/^[A-Za-z0-9_-]{32}$/);
  });
});

describe("formatQuoteNumber", () => {
  it("pads to four digits", () => {
    expect(formatQuoteNumber(1)).toBe("#0001");
    expect(formatQuoteNumber(42)).toBe("#0042");
    expect(formatQuoteNumber(12345)).toBe("#12345");
  });
});
