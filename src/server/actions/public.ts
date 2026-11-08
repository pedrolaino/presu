"use server";

import { redirect } from "next/navigation";
import { config } from "@/config";
import { db } from "@/db";
import { InvalidTransitionError } from "@/domain/status";
import { transitionMessage } from "@/lib/labels";
import { getPublicQuote, recordView, respondToQuote, responseInput } from "../data/public";
import { QuoteError } from "../data/quotes";
import { parseForm, type FormState } from "../forms";
import { allowRequest } from "../rate-limit";
import { clientIp, getSession } from "../session";

/** Called from the browser, so link previews that fetch the page do not count as a view. */
export async function trackView(token: string) {
  const now = new Date();
  if (!(await allowRequest(db, `view:${await clientIp()}`, config.rateLimits.publicView, now)))
    return;
  const session = await getSession();
  await recordView(db, token, session?.user.id ?? null, now);
}

export async function respond(token: string, _prev: FormState, form: FormData): Promise<FormState> {
  const now = new Date();
  if (
    !(await allowRequest(db, `respond:${await clientIp()}`, config.rateLimits.publicRespond, now))
  ) {
    return { error: "Hubo demasiados intentos. Probá de nuevo más tarde." };
  }
  const parsed = parseForm(responseInput, form);
  if (!parsed.data) return parsed.state;
  const found = await getPublicQuote(db, token, now);
  if (!found) return { error: "No encontramos este presupuesto." };
  if (
    !(await allowRequest(
      db,
      `respond-quote:${found.quote.id}`,
      config.rateLimits.publicRespondPerQuote,
      now,
    ))
  ) {
    return { error: "Hubo demasiados intentos. Probá de nuevo más tarde." };
  }
  try {
    await respondToQuote(db, token, parsed.data, now);
  } catch (e) {
    if (e instanceof QuoteError) return { error: e.message };
    if (e instanceof InvalidTransitionError) return { error: transitionMessage(e) };
    throw e;
  }
  redirect(`/p/${token}`);
}
