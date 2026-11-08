"use client";

import { useActionState } from "react";
import { saveBusiness } from "@/server/business";
import type { FormState } from "@/server/forms";
import { Field } from "./field";

export interface BusinessValues {
  name: string;
  phone: string;
  email: string;
  address: string;
  taxId: string;
  defaultTerms: string;
  defaultValidityDays: number;
  logoDataUrl: string | null;
}

export function BusinessForm({
  values,
  onboarding,
}: {
  values: BusinessValues;
  onboarding: boolean;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveBusiness, {});
  const err = (name: string) => state.fieldErrors?.[name];
  const input = (
    name: keyof BusinessValues,
    label: string,
    props: Record<string, unknown> = {},
  ) => (
    <Field label={label} name={name} error={err(name)}>
      <input
        id={name}
        name={name}
        defaultValue={String(values[name] ?? "")}
        aria-invalid={!!err(name)}
        aria-describedby={err(name) ? `${name}-error` : undefined}
        {...props}
      />
    </Field>
  );

  return (
    <form action={action} className="stack">
      {onboarding && <input type="hidden" name="onboarding" value="1" />}
      {input("name", "Nombre del negocio", {
        required: true,
        maxLength: 100,
        autoComplete: "organization",
      })}
      {input("phone", "Teléfono", { type: "tel", maxLength: 40, autoComplete: "tel" })}
      {input("email", "Email", { type: "email", maxLength: 120, autoComplete: "email" })}
      {input("address", "Dirección", { maxLength: 200, autoComplete: "street-address" })}
      {input("taxId", "CUIT (opcional, solo se muestra)", { maxLength: 20, inputMode: "numeric" })}
      <Field label="Logo (PNG, JPG o WebP, hasta 200 KB)" name="logo" error={err("logo")}>
        {values.logoDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={values.logoDataUrl} alt="Logo actual" width={96} />
        )}
        <input id="logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp" />
        {values.logoDataUrl && (
          <label>
            <input type="checkbox" name="removeLogo" /> Sacar el logo
          </label>
        )}
      </Field>
      <Field label="Condiciones por defecto" name="defaultTerms" error={err("defaultTerms")}>
        <textarea
          id="defaultTerms"
          name="defaultTerms"
          rows={4}
          maxLength={2000}
          defaultValue={values.defaultTerms}
        />
      </Field>
      {input("defaultValidityDays", "Días de validez por defecto", {
        type: "number",
        min: 1,
        max: 365,
        required: true,
      })}
      {state.error && <p role="alert">{state.error}</p>}
      {state.ok && <p role="status">Datos guardados.</p>}
      <button type="submit" disabled={pending}>
        {onboarding ? "Empezar" : "Guardar"}
      </button>
    </form>
  );
}
