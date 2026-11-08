// Dates without time (validity, months) are "YYYY-MM-DD" strings in Argentina time.
export const TIME_ZONE = "America/Argentina/Buenos_Aires";

const isoDate = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE });

export function todayInArgentina(now: Date): string {
  return isoDate.format(now);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
