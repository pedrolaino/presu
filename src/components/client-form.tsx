"use client";

import type { FormState } from "@/server/forms";
import { ActionForm, Input } from "./form";

export interface ClientValues {
  name: string;
  email: string;
  phone: string;
  address: string;
}

export function ClientForm({
  action,
  values,
  submitLabel,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  values?: ClientValues;
  submitLabel: string;
}) {
  return (
    <ActionForm action={action} submitLabel={submitLabel}>
      <Input label="Nombre" name="name" defaultValue={values?.name} required maxLength={120} />
      <Input label="Email" name="email" type="email" defaultValue={values?.email} maxLength={120} />
      <Input label="Teléfono" name="phone" type="tel" defaultValue={values?.phone} maxLength={40} />
      <Input label="Dirección" name="address" defaultValue={values?.address} maxLength={200} />
    </ActionForm>
  );
}
