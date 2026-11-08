import { InvalidTransitionError, type QuoteStatus } from "./status";

export type Currency = "ARS" | "USD";

export interface VersionItem {
  catalogItemId: string | null;
  name: string;
  unit: string;
  quantityHundredths: number;
  unitPriceCents: number;
  vatRateBps: number;
}

export type ItemChange =
  | { kind: "added"; name: string; after: VersionItem }
  | { kind: "removed"; name: string; before: VersionItem }
  | { kind: "changed"; name: string; before: VersionItem; after: VersionItem };

/** Drafts and not-yet-sent versions are edited in place; a sent version is never modified. */
export function planEdit(
  status: QuoteStatus,
  latestVersionSent: boolean,
): "update" | "new-version" {
  if (status === "accepted" || status === "rejected")
    throw new InvalidTransitionError(status, "edit");
  return latestVersionSent ? "new-version" : "update";
}

const itemKey = (i: VersionItem) => i.catalogItemId ?? `free:${i.name.trim().toLowerCase()}`;

const sameItem = (a: VersionItem, b: VersionItem) =>
  a.name === b.name &&
  a.unit === b.unit &&
  a.quantityHundredths === b.quantityHundredths &&
  a.unitPriceCents === b.unitPriceCents &&
  a.vatRateBps === b.vatRateBps;

export function diffItems(before: VersionItem[], after: VersionItem[]): ItemChange[] {
  const unmatched = new Map<string, VersionItem[]>();
  for (const b of before) unmatched.set(itemKey(b), [...(unmatched.get(itemKey(b)) ?? []), b]);

  const changes: ItemChange[] = [];
  const added: ItemChange[] = [];
  for (const a of after) {
    const b = unmatched.get(itemKey(a))?.shift();
    if (!b) added.push({ kind: "added", name: a.name, after: a });
    else if (!sameItem(a, b)) changes.push({ kind: "changed", name: a.name, before: b, after: a });
  }
  for (const rest of unmatched.values()) {
    for (const b of rest) changes.push({ kind: "removed", name: b.name, before: b });
  }
  return [...changes, ...added];
}

export interface PriceChange {
  name: string;
  beforeCents: number;
  afterCents: number;
}

/** Takes current catalog prices for catalog items in the same currency; everything else stays. */
export function repriceFromCatalog(
  items: VersionItem[],
  catalog: { id: string; priceCents: number; currency: Currency }[],
  currency: Currency,
): { items: VersionItem[]; changes: PriceChange[] } {
  const prices = new Map(
    catalog.filter((c) => c.currency === currency).map((c) => [c.id, c.priceCents]),
  );
  const changes: PriceChange[] = [];
  const repriced = items.map((item) => {
    const current = item.catalogItemId ? prices.get(item.catalogItemId) : undefined;
    if (current === undefined || current === item.unitPriceCents) return item;
    changes.push({ name: item.name, beforeCents: item.unitPriceCents, afterCents: current });
    return { ...item, unitPriceCents: current };
  });
  return { items: repriced, changes };
}

export function latestVersion<T extends { version: number }>(versions: T[]): T | undefined {
  return versions.reduce<T | undefined>((a, v) => (!a || v.version > a.version ? v : a), undefined);
}

/** The version the client sees: the latest sent one, or the latest draft if none was sent. */
export function liveVersion<T extends { version: number; sentAt: Date | null }>(versions: T[]) {
  return latestVersion(versions.filter((v) => v.sentAt)) ?? latestVersion(versions);
}

/**
 * The version that stands for the quote in the owner's detail page and PDF. Once the client
 * answered it is the version they answered (an unsent draft saved earlier never replaces it);
 * while the quote is open it is the latest one, draft included.
 */
export function documentVersion<T extends { version: number; sentAt: Date | null }>(
  versions: T[],
  quote: { status: QuoteStatus; acceptedVersion: number | null },
): T | undefined {
  if (quote.status === "accepted") {
    const accepted = versions.find((v) => v.version === quote.acceptedVersion);
    if (accepted) return accepted;
  }
  if (quote.status === "accepted" || quote.status === "rejected") return liveVersion(versions);
  return latestVersion(versions);
}
