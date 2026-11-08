"use client";

import { saveBusiness } from "@/server/business";
import { ActionForm, Input, Textarea } from "./form";

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
  return (
    <ActionForm
      action={saveBusiness}
      submitLabel={onboarding ? "Empezar" : "Guardar"}
      okMessage="Datos guardados."
    >
      {onboarding && <input type="hidden" name="onboarding" value="1" />}
      <Input
        label="Nombre del negocio"
        name="name"
        defaultValue={values.name}
        required
        maxLength={100}
        autoComplete="organization"
      />
      <Input
        label="Teléfono"
        name="phone"
        type="tel"
        defaultValue={values.phone}
        maxLength={40}
        autoComplete="tel"
      />
      <Input
        label="Email"
        name="email"
        type="email"
        defaultValue={values.email}
        maxLength={120}
        autoComplete="email"
      />
      <Input
        label="Dirección"
        name="address"
        defaultValue={values.address}
        maxLength={200}
        autoComplete="street-address"
      />
      <Input
        label="CUIT (opcional, solo se muestra)"
        name="taxId"
        defaultValue={values.taxId}
        maxLength={20}
        inputMode="numeric"
      />
      {values.logoDataUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={values.logoDataUrl} alt="Logo actual del negocio" width={96} />
      )}
      <Input
        label="Logo"
        name="logo"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hint="PNG, JPG o WebP, hasta 200 KB."
      />
      {values.logoDataUrl && (
        <label>
          <input type="checkbox" name="removeLogo" /> Sacar el logo
        </label>
      )}
      <Textarea
        label="Condiciones por defecto"
        name="defaultTerms"
        rows={4}
        maxLength={2000}
        defaultValue={values.defaultTerms}
      />
      <Input
        label="Días de validez por defecto"
        name="defaultValidityDays"
        type="number"
        min={1}
        max={365}
        required
        defaultValue={values.defaultValidityDays}
      />
    </ActionForm>
  );
}
