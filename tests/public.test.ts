import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { InvalidTransitionError } from "@/domain/status";
import { createClient } from "@/server/data/clients";
import { getPublicQuote, recordView, respondToQuote } from "@/server/data/public";
import { createQuote, getQuote, markSent, quoteInput, updateQuote } from "@/server/data/quotes";
import { createBusiness } from "./helpers";

const now = new Date("2026-04-10T15:00:00Z");
const later = (days: number) => new Date(now.getTime() + days * 86_400_000);
const random = (n: number) => crypto.getRandomValues(new Uint8Array(n));

let business: { id: string; userId: string };
let clientId: string;

const input = (notes = "") =>
  quoteInput.parse({
    client: { kind: "existing", id: clientId },
    items: [
      {
        catalogItemId: null,
        name: "Pintura",
        unit: "m²",
        quantity: "40",
        unitPrice: "9500",
        vatRateBps: "2100",
      },
    ],
    discount: { kind: "none", value: "" },
    vatMode: "added",
    currency: "ARS",
    validUntil: "2026-04-25",
    notes,
    terms: "",
  });

async function sentQuote() {
  const q = await createQuote(db, business.id, input("v1"), now, random);
  const token = (await markSent(db, business.id, q.id, now))!;
  return { id: q.id, token };
}

beforeAll(async () => {
  business = await createBusiness();
  clientId = await createClient(db, business.id, {
    name: "Carolina Sosa",
    email: "",
    phone: "",
    address: "",
  });
});

describe("getPublicQuote", () => {
  it("shows nothing until a version was sent, and nothing for unknown tokens", async () => {
    const q = await createQuote(db, business.id, input(), now, random);
    const token = (await getQuote(db, business.id, q.id))!.quote.shareToken!;
    expect(await getPublicQuote(db, token)).toBeNull();
    expect(await getPublicQuote(db, "x".repeat(32))).toBeNull();
    expect(await getPublicQuote(db, "not a token")).toBeNull();
  });

  it("shows the latest sent version, not unsent edits", async () => {
    const { id, token } = await sentQuote();
    await updateQuote(db, business.id, id, input("v2 sin enviar"), now);
    expect((await getPublicQuote(db, token))!.version.notes).toBe("v1");
    await markSent(db, business.id, id, now);
    expect((await getPublicQuote(db, token))!.version.notes).toBe("v2 sin enviar");
  });
});

describe("recordView", () => {
  it("marks the quote viewed the first time someone other than the owner opens it", async () => {
    const { id, token } = await sentQuote();
    await recordView(db, token, business.userId, now); // the owner
    expect((await getQuote(db, business.id, id))!.quote.status).toBe("sent");
    await recordView(db, token, null, later(1));
    await recordView(db, token, null, later(2));
    const detail = (await getQuote(db, business.id, id))!;
    expect(detail.quote.status).toBe("viewed");
    expect(detail.events.filter((e) => e.type === "viewed").map((e) => e.createdAt)).toEqual([
      later(1),
    ]);
  });
});

describe("respondToQuote", () => {
  it("accepts the version on screen and freezes it", async () => {
    const { id, token } = await sentQuote();
    await respondToQuote(
      db,
      token,
      { version: 1, decision: "accept", name: "Carolina Sosa" },
      later(1),
    );
    const detail = (await getQuote(db, business.id, id))!;
    expect(detail.quote).toMatchObject({
      status: "accepted",
      acceptedVersion: 1,
      acceptedByName: "Carolina Sosa",
    });
    expect(detail.quote.respondedAt).toEqual(later(1));
    expect(detail.events.at(-1)).toMatchObject({
      type: "accepted",
      version: 1,
      detail: "Carolina Sosa",
    });
    await expect(updateQuote(db, business.id, id, input("cambio"), later(2))).rejects.toThrow(
      InvalidTransitionError,
    );
    await expect(
      respondToQuote(db, token, { version: 1, decision: "reject", reason: "" }, later(2)),
    ).rejects.toThrow(InvalidTransitionError);
  });

  it("records a rejection with its optional reason", async () => {
    const { id, token } = await sentQuote();
    await respondToQuote(
      db,
      token,
      { version: 1, decision: "reject", reason: "Me pasé de presupuesto" },
      later(1),
    );
    const detail = (await getQuote(db, business.id, id))!;
    expect(detail.quote).toMatchObject({
      status: "rejected",
      rejectionReason: "Me pasé de presupuesto",
    });
  });

  it("refuses an answer to an outdated version", async () => {
    const { id, token } = await sentQuote();
    await updateQuote(db, business.id, id, input("v2"), now);
    await markSent(db, business.id, id, now);
    await expect(
      respondToQuote(db, token, { version: 1, decision: "accept", name: "Carolina" }, later(1)),
    ).rejects.toThrow("cambió");
  });

  it("does not accept an expired quote", async () => {
    const { token } = await sentQuote();
    await expect(
      respondToQuote(db, token, { version: 1, decision: "accept", name: "Carolina" }, later(30)),
    ).rejects.toThrow(InvalidTransitionError);
  });
});
