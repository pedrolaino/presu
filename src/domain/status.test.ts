import { describe, expect, it } from "vitest";
import {
  displayStatus,
  InvalidTransitionError,
  isExpired,
  transition,
  type QuoteStatus,
} from "./status";

const now = new Date("2026-05-15T15:00:00Z"); // 12:00 in Buenos Aires
const valid = "2026-05-15"; // last valid day is today
const past = "2026-05-14";

describe("isExpired", () => {
  it("is valid through the last day, expired the day after", () => {
    expect(isExpired({ status: "sent", validUntil: valid }, now)).toBe(false);
    expect(isExpired({ status: "sent", validUntil: past }, now)).toBe(true);
    expect(isExpired({ status: "viewed", validUntil: past }, now)).toBe(true);
  });

  it("only applies to sent and viewed quotes", () => {
    for (const status of ["draft", "accepted", "rejected"] as QuoteStatus[]) {
      expect(isExpired({ status, validUntil: past }, now)).toBe(false);
    }
  });

  it("uses the Argentina date, so late evening is still the same day", () => {
    const lateNight = new Date("2026-05-16T02:30:00Z"); // 23:30 on the 15th in Buenos Aires
    expect(isExpired({ status: "sent", validUntil: valid }, lateNight)).toBe(false);
  });
});

describe("displayStatus", () => {
  it("derives expired at read time", () => {
    expect(displayStatus({ status: "viewed", validUntil: past }, now)).toBe("expired");
    expect(displayStatus({ status: "viewed", validUntil: valid }, now)).toBe("viewed");
    expect(displayStatus({ status: "accepted", validUntil: past }, now)).toBe("accepted");
  });
});

describe("transition", () => {
  const ok: [QuoteStatus, Parameters<typeof transition>[1], QuoteStatus, string][] = [
    ["draft", "send", "sent", valid],
    ["sent", "send", "sent", valid],
    ["viewed", "send", "sent", valid],
    ["sent", "view", "viewed", valid],
    ["sent", "view", "viewed", past],
    ["sent", "accept", "accepted", valid],
    ["viewed", "accept", "accepted", valid],
    ["sent", "reject", "rejected", valid],
    ["viewed", "reject", "rejected", past],
    ["sent", "reactivate", "sent", past],
    ["viewed", "reactivate", "sent", past],
  ];
  it.each(ok)("%s --%s--> %s", (from, action, to, validUntil) => {
    expect(transition({ status: from, validUntil }, action, now)).toBe(to);
  });

  const invalid: [QuoteStatus, Parameters<typeof transition>[1], string][] = [
    ["draft", "view", valid],
    ["draft", "accept", valid],
    ["draft", "reject", valid],
    ["draft", "reactivate", past],
    ["viewed", "view", valid],
    ["accepted", "send", valid],
    ["accepted", "view", valid],
    ["accepted", "reject", valid],
    ["accepted", "accept", valid],
    ["accepted", "reactivate", past],
    ["rejected", "send", valid],
    ["rejected", "accept", valid],
    ["rejected", "reactivate", past],
    ["sent", "accept", past],
    ["viewed", "accept", past],
    ["sent", "reactivate", valid],
    ["draft", "send", past],
  ];
  it.each(invalid)("rejects %s --%s--> (valid until %s)", (from, action, validUntil) => {
    expect(() => transition({ status: from, validUntil }, action, now)).toThrow(
      InvalidTransitionError,
    );
  });
});
