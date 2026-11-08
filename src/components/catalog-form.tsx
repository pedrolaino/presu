"use client";

import type { FormState } from "@/server/forms";
import { ActionForm, Input, Select, Textarea } from "./form";

export interface CatalogValues {
  name: string;
  description: string;
  unit: string;
  priceCents: string;
  currency: string;
  vatRateBps: number;
  category: string;
  active: boolean;
}

export const VAT_OPTIONS = [
  { value: "2100", label: "21 %" },
  { value: "1050", label: "10,5 %" },
  { value: "2700", label: "27 %" },
  { value: "0", label: "0 %" },
];

export function CatalogForm({
  action,
  values,
  categories,
  submitLabel,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  values: CatalogValues;
  categories: string[];
  submitLabel: string;
}) {
  return (
    <ActionForm action={action} submitLabel={submitLabel} className="panel stack">
      <Input label="Nombre" name="name" defaultValue={values.name} required maxLength={120} />
      <Textarea
        label="Descripción"
        name="description"
        defaultValue={values.description}
        rows={2}
        maxLength={500}
      />
      <Input
        label="Unidad"
        name="unit"
        defaultValue={values.unit}
        required
        maxLength={30}
        hint="Por ejemplo: unidad, hora, metro, m²."
      />
      <Input
        label="Precio"
        name="priceCents"
        defaultValue={values.priceCents}
        required
        inputMode="decimal"
        pattern="\d+([.,]\d{1,2})?"
        hint="Sin puntos de miles. Ejemplo: 15000,50"
      />
      <Select
        label="Moneda"
        name="currency"
        defaultValue={values.currency}
        options={[
          { value: "ARS", label: "Pesos (ARS)" },
          { value: "USD", label: "Dólares (USD)" },
        ]}
      />
      <Select
        label="IVA"
        name="vatRateBps"
        defaultValue={String(values.vatRateBps)}
        options={VAT_OPTIONS}
      />
      <Input
        label="Categoría"
        name="category"
        defaultValue={values.category}
        maxLength={60}
        list="categories"
      />
      <datalist id="categories">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <label className="check">
        <input type="checkbox" name="active" defaultChecked={values.active} />
        Activo: aparece al armar presupuestos
      </label>
    </ActionForm>
  );
}
