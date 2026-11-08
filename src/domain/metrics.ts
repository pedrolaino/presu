import { addDays, todayInArgentina, TIME_ZONE } from "./dates";
import { isExpired, type QuoteStatus } from "./status";
import type { Currency } from "./versions";

export interface MetricsQuote {
  status: QuoteStatus;
  validUntil: string;
  currency: Currency;
  totalCents: number;
  sentAt: Date | null;
  respondedAt: Date | null;
}

/** Accepted over closed quotes (accepted, rejected or expired); null when none have closed. */
export function acceptanceRate(quotes: MetricsQuote[], now: Date): number | null {
  const accepted = quotes.filter((q) => q.status === "accepted").length;
  const closed = quotes.filter(
    (q) => q.status === "accepted" || q.status === "rejected" || isExpired(q, now),
  ).length;
  return closed === 0 ? null : accepted / closed;
}

export function averageResponseMs(quotes: MetricsQuote[]): number | null {
  const times = quotes.flatMap((q) =>
    (q.status === "accepted" || q.status === "rejected") && q.sentAt && q.respondedAt
      ? [q.respondedAt.getTime() - q.sentAt.getTime()]
      : [],
  );
  return times.length === 0 ? null : times.reduce((s, t) => s + t, 0) / times.length;
}

export function expiringSoon<T extends MetricsQuote>(quotes: T[], now: Date): T[] {
  const limit = addDays(todayInArgentina(now), 7);
  return quotes.filter(
    (q) =>
      (q.status === "sent" || q.status === "viewed") && !isExpired(q, now) && q.validUntil <= limit,
  );
}

const monthFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
});

export function acceptedByMonth(
  quotes: MetricsQuote[],
): { month: string; ARS: number; USD: number }[] {
  const months = new Map<string, { month: string; ARS: number; USD: number }>();
  for (const q of quotes) {
    if (q.status !== "accepted" || !q.respondedAt) continue;
    const month = monthFormat.format(q.respondedAt);
    const row = months.get(month) ?? { month, ARS: 0, USD: 0 };
    row[q.currency] += q.totalCents;
    months.set(month, row);
  }
  return [...months.values()].sort((a, b) => a.month.localeCompare(b.month));
}
