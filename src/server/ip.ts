import { isIPv4, isIPv6 } from "node:net";

interface HeaderBag {
  get(name: string): string | null;
}

/**
 * The address to rate-limit by. Only values written by a proxy we trust are used:
 * - On Vercel the edge overwrites `x-real-ip` and `x-forwarded-for`, so the client cannot set them.
 * - Elsewhere the right-most `x-forwarded-for` entry is the one the nearest proxy appended; entries
 *   to its left come from the client and are ignored.
 */
export function clientIpFrom(h: HeaderBag, onVercel: boolean): string {
  const forwarded = h.get("x-forwarded-for")?.split(",");
  const raw = onVercel ? (h.get("x-real-ip") ?? forwarded?.[0]) : forwarded?.at(-1);
  return normalizeIp(raw) ?? "unknown";
}

/**
 * Canonical form of an address, or null if it is not one. IPv6 addresses are reduced to their /64,
 * since a single connection usually controls the whole block and could rotate through it.
 */
export function normalizeIp(raw: string | null | undefined): string | null {
  const ip = raw?.trim();
  if (!ip) return null;
  if (isIPv4(ip)) return ip;
  if (!isIPv6(ip)) return null;
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  if (mapped && isIPv4(mapped[1])) return mapped[1];
  return `${expandIPv6(ip).slice(0, 4).join(":")}::/64`;
}

function expandIPv6(ip: string): string[] {
  let text = ip.toLowerCase().replace(/%.*$/, "");
  // An embedded IPv4 tail counts as the last two groups.
  const v4 = /(\d+\.\d+\.\d+\.\d+)$/.exec(text);
  if (v4) {
    const [a, b, c, d] = v4[1].split(".").map(Number);
    text =
      text.slice(0, -v4[1].length) +
      `${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const [head, tail] = text.split("::");
  const left = head ? head.split(":") : [];
  const right = tail !== undefined && tail ? tail.split(":") : [];
  const fill = tail === undefined ? [] : Array(8 - left.length - right.length).fill("0");
  return [...left, ...fill, ...right].map((g) => g.replace(/^0+(?=.)/, ""));
}
