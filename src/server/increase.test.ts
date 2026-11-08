import { describe, expect, it } from "vitest";
import { parseIncrease } from "./increase";

describe("parseIncrease", () => {
  it("reads percent and a category or ids", () => {
    expect(parseIncrease({ percent: "12,5", category: "Materiales", ids: [] })).toEqual({
      bps: 1250,
      selection: { category: "Materiales" },
    });
    expect(parseIncrease({ percent: "-10", category: "", ids: ["a", "b"] })).toEqual({
      bps: -1000,
      selection: { ids: ["a", "b"] },
    });
  });

  it("rejects missing selection, zero and out-of-range percentages", () => {
    expect(parseIncrease({ percent: "10", category: "", ids: [] })).toBeNull();
    expect(parseIncrease({ percent: "0", category: "x", ids: [] })).toBeNull();
    expect(parseIncrease({ percent: "-100", category: "x", ids: [] })).toBeNull();
    expect(parseIncrease({ percent: "1001", category: "x", ids: [] })).toBeNull();
    expect(parseIncrease({ percent: "abc", category: "x", ids: [] })).toBeNull();
  });
});
