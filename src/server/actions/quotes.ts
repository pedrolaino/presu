"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { InvalidTransitionError } from "@/domain/status";
import { transitionMessage } from "@/lib/labels";
import {
  createQuote,
  duplicateQuote,
  markSent,
  QuoteError,
  quoteInput,
  reactivateQuote,
  setShareLink,
  updateQuote,
} from "../data/quotes";
import type { FormState } from "../forms";
import { appOrigin, requireBusiness } from "../session";

function userError(e: unknown): string {
  if (e instanceof QuoteError) return e.message;
  if (e instanceof InvalidTransitionError) return transitionMessage(e);
  throw e;
}

export async function saveQuote(
  id: string | null,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const { business } = await requireBusiness();
  const raw = form.get("payload");
  if (typeof raw !== "string" || raw.length > 200_000)
    return { error: "No pudimos leer el presupuesto." };
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { error: "No pudimos leer el presupuesto." };
  }
  const parsed = quoteInput.safeParse(json);
  if (!parsed.success) {
    return { error: [...new Set(parsed.error.issues.map((i) => i.message))].join(" ") };
  }

  let quoteId = id;
  try {
    if (quoteId) await updateQuote(db, business.id, quoteId, parsed.data, new Date());
    else quoteId = (await createQuote(db, business.id, parsed.data, new Date())).id;
  } catch (e) {
    return { error: userError(e) };
  }
  redirect(`/app/quotes/${quoteId}`);
}

/** Marks the latest version as sent and returns the public link for copying or sharing. */
export async function shareQuote(id: string): Promise<{ url: string } | { error: string }> {
  const { business } = await requireBusiness();
  try {
    const token = await markSent(db, business.id, id, new Date(), randomBytes);
    return { url: `${await appOrigin()}/p/${token}` };
  } catch (e) {
    return { error: userError(e) };
  }
}

/** Error codes for redirects; the page maps them to fixed messages so the URL cannot inject text. */
function errorCode(e: unknown) {
  if (e instanceof InvalidTransitionError) return e.action;
  if (e instanceof QuoteError) return "generic";
  throw e;
}

export async function markAsSent(id: string) {
  const { business } = await requireBusiness();
  try {
    await markSent(db, business.id, id, new Date(), randomBytes);
  } catch (e) {
    redirect(`/app/quotes/${id}?error=${errorCode(e)}`);
  }
  redirect(`/app/quotes/${id}`);
}

export async function duplicate(id: string) {
  const { business } = await requireBusiness();
  const copyId = await duplicateQuote(db, business.id, id, new Date());
  redirect(`/app/quotes/${copyId}/edit`);
}

export async function reactivate(id: string) {
  const { business } = await requireBusiness();
  try {
    await reactivateQuote(db, business.id, id, new Date());
  } catch (e) {
    redirect(`/app/quotes/${id}?error=${errorCode(e)}`);
  }
  redirect(`/app/quotes/${id}`);
}

export async function regenerateLink(id: string) {
  const { business } = await requireBusiness();
  await setShareLink(db, business.id, id, randomBytes);
  redirect(`/app/quotes/${id}`);
}

export async function revokeLink(id: string) {
  const { business } = await requireBusiness();
  await setShareLink(db, business.id, id, null);
  redirect(`/app/quotes/${id}`);
}
