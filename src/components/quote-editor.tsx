"use client";

import { useState } from "react";
import { computeTotals, type VatMode } from "@/domain/totals";
import type { Currency } from "@/domain/versions";
import { formatMoney, formatPercent, parseFixed2, toFixed2 } from "@/lib/numbers";
import type { FormState } from "@/server/forms";
import { VAT_OPTIONS } from "./catalog-form";
import { ActionForm } from "./form";

export interface EditorItem {
  catalogItemId: string | null;
  name: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  vatRateBps: number;
}

export interface EditorValues {
  client:
    | { kind: "existing"; id: string }
    | { kind: "new"; data: { name: string; email: string; phone: string; address: string } };
  items: EditorItem[];
  discount: { kind: "none" | "percent" | "amount"; value: string };
  vatMode: VatMode;
  currency: Currency;
  validUntil: string;
  notes: string;
  terms: string;
}

export interface CatalogOption {
  id: string;
  name: string;
  unit: string;
  priceCents: number;
  currency: Currency;
  vatRateBps: number;
}

const newClient = { name: "", email: "", phone: "", address: "" };

export function QuoteEditor({
  action,
  initial,
  clients,
  catalog,
  submitLabel,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  initial: EditorValues;
  clients: { id: string; name: string }[];
  catalog: CatalogOption[];
  submitLabel: string;
}) {
  const [v, setV] = useState(initial);
  const [pick, setPick] = useState("");
  const set = (patch: Partial<EditorValues>) => setV((prev) => ({ ...prev, ...patch }));
  const setItem = (index: number, patch: Partial<EditorItem>) =>
    set({ items: v.items.map((it, i) => (i === index ? { ...it, ...patch } : it)) });

  const lines = v.items.map((it) => ({
    quantityHundredths: parseFixed2(it.quantity) ?? 0,
    unitPriceCents: parseFixed2(it.unitPrice) ?? 0,
    vatRateBps: it.vatRateBps,
  }));
  const discountValue = parseFixed2(v.discount.value);
  let totals: ReturnType<typeof computeTotals> | null = null;
  try {
    totals = computeTotals({
      lines,
      vatMode: v.vatMode,
      discount:
        v.discount.kind === "none" || !discountValue
          ? null
          : v.discount.kind === "percent"
            ? { kind: "percent", bps: Math.min(discountValue, 10_000) }
            : { kind: "amount", cents: discountValue },
    });
  } catch {
    // Amounts too large to compute; the server will say so on save.
  }
  const money = (cents: number) => formatMoney(cents, v.currency);
  const sameCurrency = catalog.filter((c) => c.currency === v.currency);

  function addFromCatalog() {
    const item = catalog.find((c) => c.id === pick);
    if (!item) return;
    set({
      items: [
        ...v.items,
        {
          catalogItemId: item.id,
          name: item.name,
          unit: item.unit,
          quantity: "1",
          unitPrice: toFixed2(item.priceCents),
          vatRateBps: item.vatRateBps,
        },
      ],
    });
    setPick("");
  }

  return (
    <ActionForm action={action} submitLabel={submitLabel}>
      <input type="hidden" name="payload" value={JSON.stringify(v)} />

      <fieldset className="stack">
        <legend>Cliente</legend>
        <div className="field">
          <label htmlFor="client">Cliente</label>
          <select
            id="client"
            value={v.client.kind === "existing" ? v.client.id : "new"}
            onChange={(e) =>
              set({
                client:
                  e.target.value === "new"
                    ? { kind: "new", data: newClient }
                    : { kind: "existing", id: e.target.value },
              })
            }
          >
            <option value="" disabled>
              Elegí un cliente
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value="new">+ Cliente nuevo</option>
          </select>
        </div>
        {v.client.kind === "new" &&
          (
            [
              ["name", "Nombre", "text"],
              ["phone", "Teléfono", "tel"],
              ["email", "Email", "email"],
              ["address", "Dirección", "text"],
            ] as const
          ).map(([key, label, type]) => {
            const data = v.client.kind === "new" ? v.client.data : newClient;
            return (
              <div className="field" key={key}>
                <label htmlFor={`client-${key}`}>{label}</label>
                <input
                  id={`client-${key}`}
                  type={type}
                  required={key === "name"}
                  maxLength={key === "name" ? 120 : 200}
                  value={data[key]}
                  onChange={(e) =>
                    set({ client: { kind: "new", data: { ...data, [key]: e.target.value } } })
                  }
                />
              </div>
            );
          })}
      </fieldset>

      <div className="actions">
        <div className="field">
          <label htmlFor="currency">Moneda</label>
          <select
            id="currency"
            value={v.currency}
            onChange={(e) => set({ currency: e.target.value as Currency })}
          >
            <option value="ARS">Pesos (ARS)</option>
            <option value="USD">Dólares (USD)</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="vatMode">IVA</label>
          <select
            id="vatMode"
            value={v.vatMode}
            onChange={(e) => set({ vatMode: e.target.value as VatMode })}
          >
            <option value="added">Se suma al total</option>
            <option value="included">Incluido en los precios</option>
            <option value="none">No aplica</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="validUntil">Válido hasta</label>
          <input
            id="validUntil"
            type="date"
            required
            value={v.validUntil}
            onChange={(e) => set({ validUntil: e.target.value })}
          />
        </div>
      </div>

      <fieldset className="stack">
        <legend>Ítems</legend>
        {v.items.length === 0 && <p>Todavía no agregaste ítems.</p>}
        {v.items.map((it, i) => (
          <div key={i} className="item-row" role="group" aria-label={`Ítem ${i + 1}`}>
            <div className="field">
              <label htmlFor={`item-${i}-name`}>Descripción</label>
              <input
                id={`item-${i}-name`}
                required
                maxLength={120}
                value={it.name}
                onChange={(e) => setItem(i, { name: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor={`item-${i}-qty`}>Cantidad</label>
              <input
                id={`item-${i}-qty`}
                inputMode="decimal"
                required
                value={it.quantity}
                onChange={(e) => setItem(i, { quantity: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor={`item-${i}-unit`}>Unidad</label>
              <input
                id={`item-${i}-unit`}
                maxLength={30}
                value={it.unit}
                onChange={(e) => setItem(i, { unit: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor={`item-${i}-price`}>Precio unitario</label>
              <input
                id={`item-${i}-price`}
                inputMode="decimal"
                required
                value={it.unitPrice}
                onChange={(e) => setItem(i, { unitPrice: e.target.value })}
              />
            </div>
            {v.vatMode === "added" && (
              <div className="field">
                <label htmlFor={`item-${i}-vat`}>IVA</label>
                <select
                  id={`item-${i}-vat`}
                  value={it.vatRateBps}
                  onChange={(e) => setItem(i, { vatRateBps: Number(e.target.value) })}
                >
                  {VAT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <p className="num">
              Subtotal: <output>{totals ? money(totals.lineSubtotals[i]) : "—"}</output>
            </p>
            <button
              type="button"
              onClick={() => set({ items: v.items.filter((_, j) => j !== i) })}
              aria-label={`Quitar ítem ${i + 1}`}
            >
              Quitar
            </button>
          </div>
        ))}

        <div className="actions">
          <label htmlFor="catalog-pick">Agregar del catálogo</label>
          <select id="catalog-pick" value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">Elegí un ítem</option>
            {sameCurrency.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {formatMoney(c.priceCents, c.currency)} / {c.unit}
              </option>
            ))}
          </select>
          <button type="button" onClick={addFromCatalog} disabled={!pick}>
            Agregar
          </button>
          <button
            type="button"
            onClick={() =>
              set({
                items: [
                  ...v.items,
                  {
                    catalogItemId: null,
                    name: "",
                    unit: "unidad",
                    quantity: "1",
                    unitPrice: "",
                    vatRateBps: 2100,
                  },
                ],
              })
            }
          >
            Agregar ítem libre
          </button>
        </div>
      </fieldset>

      <div className="actions">
        <div className="field">
          <label htmlFor="discountKind">Descuento</label>
          <select
            id="discountKind"
            value={v.discount.kind}
            onChange={(e) =>
              set({
                discount: {
                  ...v.discount,
                  kind: e.target.value as EditorValues["discount"]["kind"],
                },
              })
            }
          >
            <option value="none">Sin descuento</option>
            <option value="percent">Porcentaje</option>
            <option value="amount">Monto fijo</option>
          </select>
        </div>
        {v.discount.kind !== "none" && (
          <div className="field">
            <label htmlFor="discountValue">
              {v.discount.kind === "percent" ? "Porcentaje" : "Monto"}
            </label>
            <input
              id="discountValue"
              inputMode="decimal"
              required
              value={v.discount.value}
              onChange={(e) => set({ discount: { ...v.discount, value: e.target.value } })}
            />
          </div>
        )}
      </div>

      {totals && (
        <dl className="totals" aria-live="polite">
          <dt>Subtotal</dt>
          <dd className="num">{money(totals.subtotalCents)}</dd>
          {totals.discountCents > 0 && (
            <>
              <dt>Descuento</dt>
              <dd className="num">−{money(totals.discountCents)}</dd>
            </>
          )}
          {totals.vatBreakdown.map((g) => (
            <div key={g.rateBps} style={{ display: "contents" }}>
              <dt>IVA {formatPercent(g.rateBps)}</dt>
              <dd className="num">{money(g.vatCents)}</dd>
            </div>
          ))}
          <dt>Total</dt>
          <dd className="num">
            <strong>{money(totals.totalCents)}</strong>
          </dd>
        </dl>
      )}

      <div className="field">
        <label htmlFor="notes">Notas</label>
        <textarea
          id="notes"
          rows={3}
          maxLength={2000}
          value={v.notes}
          onChange={(e) => set({ notes: e.target.value })}
        />
      </div>
      <div className="field">
        <label htmlFor="terms">Condiciones</label>
        <textarea
          id="terms"
          rows={3}
          maxLength={2000}
          value={v.terms}
          onChange={(e) => set({ terms: e.target.value })}
        />
      </div>
    </ActionForm>
  );
}
