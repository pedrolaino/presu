"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { parseForm, optionalEmail, requiredText, text, type FormState } from "./forms";
import { LogoError, processLogo } from "./logo";
import { requireUser } from "./session";

const businessSchema = z.object({
  name: requiredText(100, "Poné el nombre del negocio."),
  phone: text(40),
  email: optionalEmail,
  address: text(200),
  taxId: text(20).regex(/^[\d-]*$/, "El CUIT lleva solo números y guiones."),
  defaultTerms: text(2000),
  defaultValidityDays: z.coerce
    .number("Poné un número de días.")
    .int("Poné un número de días.")
    .min(1, "Tiene que ser al menos 1 día.")
    .max(365, "Máximo 365 días."),
});

export async function saveBusiness(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseForm(businessSchema, form);
  if (!parsed.data) return parsed.state;

  let logo: Buffer | null | undefined; // undefined keeps the current logo
  const file = form.get("logo");
  if (file instanceof File && file.size > 0) {
    try {
      logo = await processLogo(new Uint8Array(await file.arrayBuffer()));
    } catch (e) {
      if (e instanceof LogoError) return { error: e.message, fieldErrors: { logo: e.message } };
      throw e;
    }
  } else if (form.get("removeLogo") === "on") {
    logo = null;
  }

  const values = { ...parsed.data, ...(logo !== undefined && { logo }) };
  await db
    .insert(businesses)
    .values({ userId: user.id, ...values })
    .onConflictDoUpdate({ target: businesses.userId, set: values });

  if (form.get("onboarding") === "1") redirect("/app/quotes");
  return { ok: true };
}
