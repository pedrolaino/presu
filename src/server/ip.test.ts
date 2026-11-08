import { describe, expect, it } from "vitest";
import { clientIpFrom, normalizeIp } from "./ip";

const headers = (values: Record<string, string>) => ({
  get: (name: string) => values[name] ?? null,
});

describe("clientIpFrom", () => {
  it("on Vercel uses the address the edge wrote", () => {
    expect(clientIpFrom(headers({ "x-real-ip": "203.0.113.7" }), true)).toBe("203.0.113.7");
    expect(clientIpFrom(headers({ "x-forwarded-for": "203.0.113.7" }), true)).toBe("203.0.113.7");
  });

  it("elsewhere ignores the entries the client could have added", () => {
    const h = headers({ "x-forwarded-for": "10.0.0.1, 10.0.0.2, 198.51.100.4" });
    expect(clientIpFrom(h, false)).toBe("198.51.100.4");
  });

  it("does not trust values that are not addresses", () => {
    expect(clientIpFrom(headers({ "x-forwarded-for": "anything-goes" }), false)).toBe("unknown");
    expect(clientIpFrom(headers({}), false)).toBe("unknown");
  });
});

describe("normalizeIp", () => {
  it("keeps IPv4 and unwraps IPv4-mapped IPv6", () => {
    expect(normalizeIp(" 192.0.2.1 ")).toBe("192.0.2.1");
    expect(normalizeIp("::ffff:192.0.2.1")).toBe("192.0.2.1");
  });

  it("groups IPv6 by /64 whatever the spelling", () => {
    const a = normalizeIp("2001:db8:0:1:aaaa::1");
    expect(a).toBe("2001:db8:0:1::/64");
    expect(normalizeIp("2001:0DB8:0000:0001:ffff:ffff:ffff:ffff")).toBe(a);
    expect(normalizeIp("2001:db8::1")).toBe("2001:db8:0:0::/64");
  });

  it("rejects garbage", () => {
    expect(normalizeIp("1.2.3")).toBeNull();
    expect(normalizeIp("")).toBeNull();
    expect(normalizeIp(null)).toBeNull();
  });
});
