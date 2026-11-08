import type { Currency } from "@/domain/versions";

/** "1234.56" or "1234,56" -> 123456. Used for money (cents), quantities and percentages (hundredths). */
export function parseFixed2(input: string): number | null {
  const m = /^(\d{1,12})(?:[.,](\d{1,2}))?$/.exec(input.trim());
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
}

/** 123456 -> "1234.56", for prefilling inputs. */
export function toFixed2(hundredths: number): string {
  const whole = Math.trunc(hundredths / 100);
  const frac = String(hundredths % 100)
    .padStart(2, "0")
    .replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : String(whole);
}

const moneyFormats = {
  ARS: new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }),
  USD: new Intl.NumberFormat("es-AR", { style: "currency", currency: "USD" }),
};
const decimal = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });

export const formatMoney = (cents: number, currency: Currency) =>
  moneyFormats[currency].format(cents / 100);

export const formatQuantity = (hundredths: number) => decimal.format(hundredths / 100);

export const formatPercent = (bps: number) => `${decimal.format(bps / 100)} %`;
