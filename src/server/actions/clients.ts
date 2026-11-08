"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import { clientInput, createClient, deleteClient, updateClient } from "../data/clients";
import { parseForm, type FormState } from "../forms";
import { requireBusiness } from "../session";

export async function saveClient(
  id: string | null,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const { business } = await requireBusiness();
  const parsed = parseForm(clientInput, form);
  if (!parsed.data) return parsed.state;
  if (id) {
    if (!(await updateClient(db, business.id, id, parsed.data)))
      return { error: "No encontramos ese cliente." };
  } else {
    await createClient(db, business.id, parsed.data);
  }
  redirect("/app/clients");
}

export async function removeClient(id: string) {
  const { business } = await requireBusiness();
  await deleteClient(db, business.id, id);
  redirect("/app/clients");
}
