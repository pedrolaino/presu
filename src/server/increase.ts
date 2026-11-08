import { z } from "zod";
import { parseFixed2 } from "@/lib/numbers";
import type { Selection } from "./data/catalog";

const increaseInput = z.object({
  percent: z.string().trim().max(10),
  category: z.string().max(60).nullish(),
  ids: z.array(z.string().max(40)).max(500),
});

/** Reads "+X %" and what it applies to, from either the preview query string or the apply form. */
export function parseIncrease(raw: unknown): { bps: number; selection: Selection } | null {
  const parsed = increaseInput.safeParse(raw);
  if (!parsed.success) return null;
  const negative = parsed.data.percent.startsWith("-");
  const value = parseFixed2(parsed.data.percent.replace(/^[-+]/, ""));
  if (value === null || value === 0) return null;
  const bps = negative ? -value : value;
  if (bps <= -10_000 || bps > 100_000) return null;
  if (parsed.data.category) return { bps, selection: { category: parsed.data.category } };
  if (parsed.data.ids.length > 0) return { bps, selection: { ids: parsed.data.ids } };
  return null;
}
