// Settings the owner may want to tune, in one place.
export const config = {
  appName: "Presu",
  defaultValidityDays: 15,
  guestAccountTtlHours: 24,
  logo: { maxBytes: 200 * 1024, maxSidePx: 400 },
  // Fixed-window limits stored in Postgres: `limit` hits per `windowSeconds`.
  rateLimits: {
    guestPerIp: { limit: 5, windowSeconds: 3600 },
    guestGlobal: { limit: 300, windowSeconds: 3600 },
    publicView: { limit: 60, windowSeconds: 60 },
    publicRespond: { limit: 10, windowSeconds: 3600 },
    pdf: { limit: 30, windowSeconds: 600 },
  },
} as const;

export interface RateLimitRule {
  limit: number;
  windowSeconds: number;
}
