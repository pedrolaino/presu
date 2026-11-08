import { and, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db";
import { businesses, quoteEvents, quotes, quoteVersions } from "@/db/schema";
import { transition } from "@/domain/status";
import { latestVersion } from "@/domain/versions";
import { text } from "../forms";
import { QuoteError } from "./quotes";

// Everything here is reached with a share token only, so it never trusts anything else from the request.

const isToken = (token: string) => /^[A-Za-z0-9_-]{32}$/.test(token);

/** The quote as the client sees it: the latest sent version. Null for unknown, revoked or unsent links. */
export async function getPublicQuote(db: Db, token: string) {
  if (!isToken(token)) return null;
  const [row] = await db
    .select({ quote: quotes, business: businesses })
    .from(quotes)
    .innerJoin(businesses, eq(businesses.id, quotes.businessId))
    .where(eq(quotes.shareToken, token));
  if (!row) return null;
  const sent = await db
    .select()
    .from(quoteVersions)
    .where(and(eq(quoteVersions.quoteId, row.quote.id), isNotNull(quoteVersions.sentAt)));
  const version = latestVersion(sent);
  return version ? { ...row, version } : null;
}

/** First open by someone other than the owner moves a sent quote to viewed. */
export async function recordView(db: Db, token: string, viewerUserId: string | null, now: Date) {
  const found = await getPublicQuote(db, token);
  if (!found || found.business.userId === viewerUserId || found.quote.status !== "sent") return;
  await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(quotes)
      .set({ status: "viewed" })
      .where(and(eq(quotes.id, found.quote.id), eq(quotes.status, "sent")))
      .returning({ id: quotes.id });
    if (updated) {
      await tx.insert(quoteEvents).values({
        quoteId: updated.id,
        type: "viewed",
        version: found.version.version,
        createdAt: now,
      });
    }
  });
}

export const responseInput = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("accept"),
    version: z.coerce.number().int().positive(),
    name: text(120).min(2, "Escribí tu nombre para aceptar."),
  }),
  z.object({
    decision: z.literal("reject"),
    version: z.coerce.number().int().positive(),
    reason: text(500),
  }),
]);
export type ResponseInput = z.infer<typeof responseInput>;

export async function respondToQuote(db: Db, token: string, input: ResponseInput, now: Date) {
  if (!isToken(token)) throw new QuoteError("No encontramos este presupuesto.");
  await db.transaction(async (tx) => {
    const [quote] = await tx
      .select()
      .from(quotes)
      .where(eq(quotes.shareToken, token))
      .for("update");
    if (!quote) throw new QuoteError("No encontramos este presupuesto.");
    const sent = await tx
      .select()
      .from(quoteVersions)
      .where(and(eq(quoteVersions.quoteId, quote.id), isNotNull(quoteVersions.sentAt)));
    const live = latestVersion(sent);
    if (!live) throw new QuoteError("No encontramos este presupuesto.");
    if (live.version !== input.version) {
      throw new QuoteError(
        "El presupuesto cambió mientras lo mirabas. Recargá la página para ver la versión actual.",
      );
    }

    const status = transition(
      { status: quote.status, validUntil: live.validUntil },
      input.decision,
      now,
    );
    const accepted = input.decision === "accept";
    await tx
      .update(quotes)
      .set({
        status,
        respondedAt: now,
        acceptedVersion: accepted ? live.version : null,
        acceptedByName: accepted ? input.name : null,
        rejectionReason: accepted ? null : input.reason || null,
      })
      .where(eq(quotes.id, quote.id));
    await tx.insert(quoteEvents).values({
      quoteId: quote.id,
      type: accepted ? "accepted" : "rejected",
      version: live.version,
      detail: accepted ? input.name : input.reason || null,
      createdAt: now,
    });
  });
}
