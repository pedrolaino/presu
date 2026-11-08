"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  applyBulkIncrease,
  catalogInput,
  createCatalogItem,
  deleteCatalogItem,
  updateCatalogItem,
} from "../data/catalog";
import { parseForm, type FormState } from "../forms";
import { requireBusiness } from "../session";
import { parseIncrease } from "../increase";

export async function saveCatalogItem(
  id: string | null,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const { business } = await requireBusiness();
  const parsed = parseForm(catalogInput, form);
  if (!parsed.data) return parsed.state;
  if (id) {
    if (!(await updateCatalogItem(db, business.id, id, parsed.data)))
      return { error: "No encontramos ese ítem." };
  } else {
    await createCatalogItem(db, business.id, parsed.data);
  }
  redirect("/app/catalog");
}

export async function removeCatalogItem(id: string) {
  const { business } = await requireBusiness();
  await deleteCatalogItem(db, business.id, id);
  redirect("/app/catalog");
}

export async function applyIncrease(form: FormData) {
  const { business } = await requireBusiness();
  const parsed = parseIncrease({
    percent: form.get("percent"),
    category: form.get("category"),
    ids: form.getAll("id"),
  });
  if (!parsed) redirect("/app/catalog/increase");
  const count = await applyBulkIncrease(db, business.id, parsed.selection, parsed.bps);
  redirect(`/app/catalog?updated=${count}`);
}
