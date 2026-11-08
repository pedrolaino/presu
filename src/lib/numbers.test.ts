import { describe, expect, it } from "vitest";
import { formatMoney, formatPercent, formatQuantity, parseFixed2, toFixed2 } from "./numbers";

describe("parseFixed2", () => {
  it("reads up to two decimals into an integer of hundredths, without floats", () => {
    expect(parseFixed2("1234.56")).toBe(123456);
    expect(parseFixed2("1234,5")).toBe(123450);
    expect(parseFixed2("0.07")).toBe(7);
    expect(parseFixed2(" 15 ")).toBe(1500);
    expect(parseFixed2("0")).toBe(0);
  });

  it("rejects anything else", () => {
    for (const bad of ["", "1.234,56", "1e3", "-5", "1.234", "abc", "12.", ".5", "9999999999999"]) {
      expect(parseFixed2(bad), bad).toBeNull();
    }
  });
});

describe("toFixed2", () => {
  it("is the inverse for form inputs", () => {
    expect(toFixed2(123456)).toBe("1234.56");
    expect(toFixed2(7)).toBe("0.07");
    expect(toFixed2(1500)).toBe("15");
    expect(toFixed2(250)).toBe("2.5");
  });
});

describe("formatting", () => {
  it("formats money for Argentina", () => {
    expect(formatMoney(123456789, "ARS").replace(/\s/g, " ")).toBe("$ 1.234.567,89");
    expect(formatMoney(15000, "USD").replace(/\s/g, " ")).toBe("US$ 150,00");
  });

  it("formats quantities and percentages", () => {
    expect(formatQuantity(250)).toBe("2,5");
    expect(formatQuantity(100000)).toBe("1.000");
    expect(formatPercent(1050)).toBe("10,5 %");
    expect(formatPercent(2100)).toBe("21 %");
  });
});
