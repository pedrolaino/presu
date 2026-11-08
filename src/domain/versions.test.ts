import { describe, expect, it } from "vitest";
import { InvalidTransitionError } from "./status";
import {
  diffItems,
  documentVersion,
  latestVersion,
  liveVersion,
  planEdit,
  repriceFromCatalog,
  type VersionItem,
} from "./versions";

const item = (over: Partial<VersionItem> = {}): VersionItem => ({
  catalogItemId: null,
  name: "Mano de obra",
  unit: "hora",
  quantityHundredths: 100,
  unitPriceCents: 1_000_000,
  vatRateBps: 2100,
  ...over,
});

describe("planEdit", () => {
  it("edits drafts and unsent versions in place", () => {
    expect(planEdit("draft", false)).toBe("update");
    expect(planEdit("sent", false)).toBe("update");
  });

  it("creates a new version once the latest one was sent", () => {
    expect(planEdit("sent", true)).toBe("new-version");
    expect(planEdit("viewed", true)).toBe("new-version");
  });

  it("never edits accepted or rejected quotes", () => {
    expect(() => planEdit("accepted", true)).toThrow(InvalidTransitionError);
    expect(() => planEdit("rejected", true)).toThrow(InvalidTransitionError);
  });
});

describe("diffItems", () => {
  it("reports nothing for identical items", () => {
    expect(diffItems([item()], [item()])).toEqual([]);
  });

  it("detects added, removed and changed items", () => {
    const before = [
      item({ catalogItemId: "a", name: "Cable 2,5 mm", unitPriceCents: 150_000 }),
      item({ name: "Visita técnica" }),
    ];
    const after = [
      item({
        catalogItemId: "a",
        name: "Cable 2,5 mm",
        unitPriceCents: 180_000,
        quantityHundredths: 250,
      }),
      item({ name: "Tablero", unitPriceCents: 5_000_000 }),
    ];
    expect(diffItems(before, after)).toEqual([
      { kind: "changed", name: "Cable 2,5 mm", before: before[0], after: after[0] },
      { kind: "removed", name: "Visita técnica", before: before[1] },
      { kind: "added", name: "Tablero", after: after[1] },
    ]);
  });

  it("matches free items by name, ignoring case and spaces", () => {
    expect(diffItems([item({ name: "Pintura " })], [item({ name: "pintura" })])).toEqual([
      {
        kind: "changed",
        name: "pintura",
        before: item({ name: "Pintura " }),
        after: item({ name: "pintura" }),
      },
    ]);
  });

  it("pairs repeated items in order", () => {
    const a = item({ quantityHundredths: 100 });
    const b = item({ quantityHundredths: 200 });
    expect(diffItems([a, b], [a])).toEqual([{ kind: "removed", name: a.name, before: b }]);
  });
});

describe("repriceFromCatalog", () => {
  const catalog = [
    { id: "a", priceCents: 120_000, currency: "ARS" as const },
    { id: "b", priceCents: 9_900, currency: "USD" as const },
  ];

  it("updates catalog items to current prices and lists the differences", () => {
    const items = [
      item({ catalogItemId: "a", name: "Cable", unitPriceCents: 100_000 }),
      item({ name: "Libre", unitPriceCents: 5_000 }),
    ];
    const result = repriceFromCatalog(items, catalog, "ARS");
    expect(result.items.map((i) => i.unitPriceCents)).toEqual([120_000, 5_000]);
    expect(result.changes).toEqual([{ name: "Cable", beforeCents: 100_000, afterCents: 120_000 }]);
  });

  it("keeps the old price when the catalog item is gone or in another currency", () => {
    const items = [
      item({ catalogItemId: "b", unitPriceCents: 1_000 }),
      item({ catalogItemId: "zzz", unitPriceCents: 2_000 }),
    ];
    const result = repriceFromCatalog(items, catalog, "ARS");
    expect(result.items).toEqual(items);
    expect(result.changes).toEqual([]);
  });

  it("does not list unchanged prices", () => {
    const items = [item({ catalogItemId: "a", unitPriceCents: 120_000 })];
    expect(repriceFromCatalog(items, catalog, "ARS").changes).toEqual([]);
  });
});

describe("liveVersion", () => {
  it("is the latest sent version, which is what the client sees", () => {
    const v = (version: number, sent: boolean) => ({ version, sentAt: sent ? new Date() : null });
    expect(liveVersion([v(1, true), v(2, true), v(3, false)])?.version).toBe(2);
    expect(liveVersion([v(3, false), v(1, true)])?.version).toBe(1);
  });

  it("falls back to the latest draft when nothing was sent", () => {
    expect(
      liveVersion([
        { version: 1, sentAt: null },
        { version: 2, sentAt: null },
      ])?.version,
    ).toBe(2);
    expect(liveVersion([])).toBeUndefined();
  });
});

describe("latestVersion", () => {
  it("is the highest version number", () => {
    expect(latestVersion([{ version: 2 }, { version: 5 }, { version: 1 }])?.version).toBe(5);
  });
});

describe("documentVersion", () => {
  const v = (version: number, sent: boolean) => ({ version, sentAt: sent ? new Date() : null });
  const versions = [v(1, true), v(2, false)];

  it("is the accepted version, not a draft saved before the client accepted", () => {
    expect(documentVersion(versions, { status: "accepted", acceptedVersion: 1 })?.version).toBe(1);
  });

  it("is the version the client rejected", () => {
    expect(documentVersion(versions, { status: "rejected", acceptedVersion: null })?.version).toBe(
      1,
    );
  });

  it("is the latest version, draft included, while the quote is open", () => {
    expect(documentVersion(versions, { status: "viewed", acceptedVersion: null })?.version).toBe(2);
  });
});
