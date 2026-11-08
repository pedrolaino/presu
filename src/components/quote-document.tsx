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
      <div className="table-wrap">
        <table>
          <caption className="visually-hidden">Ítems del presupuesto</caption>
          <thead>
            <tr>
              <th scope="col">Descripción</th>
              <th scope="col" className="num">
                Cantidad
              </th>
              <th scope="col" className="num">
                Precio unitario
              </th>
              {version.vatMode === "added" && (
                <th scope="col" className="num">
                  IVA
                </th>
              )}
              <th scope="col" className="num">
                Subtotal
              </th>
            </tr>
          </thead>
          <tbody>
            {version.items.map((item, i) => (
              <tr key={i}>
                <td>{item.name}</td>
                <td className="num">
                  {formatQuantity(item.quantityHundredths)} {item.unit}
                </td>
                <td className="num">{money(item.unitPriceCents)}</td>
                {version.vatMode === "added" && (
                  <td className="num">{formatPercent(item.vatRateBps)}</td>
                )}
                <td className="num">{money(totals.lineSubtotals[i])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="totals">
        <dt>Subtotal</dt>
        <dd className="num">{money(totals.subtotalCents)}</dd>
        {totals.discountCents > 0 && (
          <>
            <dt>
              Descuento
              {version.discount?.kind === "percent" && ` (${formatPercent(version.discount.bps)})`}
            </dt>
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
      {version.vatMode === "included" && <p>Los precios incluyen IVA.</p>}

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
          <p className="pre-line">{version.terms}</p>
        </section>
      )}
    </div>
  );
}
