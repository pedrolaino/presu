import { describe, expect, it } from "vitest";
import { addDays, todayInArgentina } from "./dates";

describe("todayInArgentina", () => {
  it("uses Buenos Aires time, not UTC", () => {
    // 02:00 UTC is still the previous evening in Argentina (UTC-3)
    expect(todayInArgentina(new Date("2026-03-10T02:00:00Z"))).toBe("2026-03-09");
    expect(todayInArgentina(new Date("2026-03-10T03:00:00Z"))).toBe("2026-03-10");
  });
});

describe("addDays", () => {
  it("crosses month and year boundaries", () => {
    expect(addDays("2026-01-30", 3)).toBe("2026-02-02");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-10", 0)).toBe("2026-03-10");
  });
});
