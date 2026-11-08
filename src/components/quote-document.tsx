import type { quoteVersions } from "@/db/schema";
import { computeTotals } from "@/domain/totals";
import { formatDate } from "@/lib/labels";
import { formatMoney, formatPercent, formatQuantity } from "@/lib/numbers";

/** The quote content as the client reads it: items, totals, validity, notes and terms. */
export function QuoteDocument({ version }: { version: typeof quoteVersions.$inferSelect }) {
  const totals = computeTotals({
    lines: version.items,
    discount: version.discount,
    vatMode: version.vatMode,
  });
  const money = (cents: number) => formatMoney(cents, version.currency);

  return (
    <div className="stack">
      <ul className="items" aria-label="Ítems del presupuesto">
        {version.items.map((item, i) => (
          <li key={i}>
            <div>
              <div className="item-name">{item.name}</div>
              <div className="item-meta">
                {formatQuantity(item.quantityHundredths)} {item.unit} × {money(item.unitPriceCents)}
                {version.vatMode === "added" && `, IVA ${formatPercent(item.vatRateBps)}`}
              </div>
            </div>
            <div className="item-total">{money(totals.lineSubtotals[i])}</div>
          </li>
        ))}
      </ul>

      <dl className="totals">
        <dt>Subtotal</dt>
        <dd>{money(totals.subtotalCents)}</dd>
        {totals.discountCents > 0 && (
          <>
            <dt>
              Descuento
              {version.discount?.kind === "percent" && ` ${formatPercent(version.discount.bps)}`}
            </dt>
            <dd>−{money(totals.discountCents)}</dd>
          </>
        )}
        {totals.vatBreakdown.map((g) => (
          <div key={g.rateBps} style={{ display: "contents" }}>
            <dt>IVA {formatPercent(g.rateBps)}</dt>
            <dd>{money(g.vatCents)}</dd>
          </div>
        ))}
        <dt className="total-label">Total</dt>
        <dd className="total-value">{money(totals.totalCents)}</dd>
      </dl>
      {version.vatMode === "included" && (
        <p className="muted" style={{ textAlign: "right" }}>
          Los precios incluyen IVA.
        </p>
      )}

      <p>
        Válido hasta el <strong>{formatDate(version.validUntil)}</strong>.
      </p>
      {version.notes && (
        <section>
          <h3>Notas</h3>
          <p className="pre-line">{version.notes}</p>
        </section>
      )}
      {version.terms && (
        <section>
          <h3>Condiciones</h3>
          <p className="pre-line muted">{version.terms}</p>
        </section>
      )}
    </div>
  );
}
