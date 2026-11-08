import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { formatQuoteNumber } from "@/domain/share";
import { isExpired } from "@/domain/status";
import { formatDate } from "@/lib/labels";
import { formatMoney } from "@/lib/numbers";
import { reactivate } from "@/server/actions/quotes";
import { getQuote, previewReactivation } from "@/server/data/quotes";
import { requireBusiness } from "@/server/session";

export default async function Reactivate({ params }: PageProps<"/app/quotes/[id]/reactivate">) {
  const { business } = await requireBusiness();
  const { id } = await params;
  const now = new Date();
  const [detail, preview] = await Promise.all([
    getQuote(db, business.id, id),
    previewReactivation(db, business.id, id, now),
  ]);
  if (!detail || !preview) notFound();
  const money = (cents: number) => formatMoney(cents, preview.live.currency);
  const expired = isExpired(
    { status: detail.quote.status, validUntil: preview.live.validUntil },
    now,
  );

  return (
    <div className="stack">
      <h1>Reactivar presupuesto {formatQuoteNumber(detail.quote.number)}</h1>
      {!expired ? (
        <p role="alert">Este presupuesto no está vencido.</p>
      ) : (
        <>
          <p>
            Se crea una versión nueva con los precios actuales del catálogo, válida hasta el{" "}
            <strong>{formatDate(preview.validUntil)}</strong>, y queda enviada.
          </p>
          {preview.changes.length === 0 ? (
            <p>Los precios no cambiaron.</p>
          ) : (
            <table>
              <caption>Cambios de precio</caption>
              <thead>
                <tr>
                  <th scope="col">Ítem</th>
                  <th scope="col" className="num">
                    Antes
                  </th>
                  <th scope="col" className="num">
                    Ahora
                  </th>
                </tr>
              </thead>
              <tbody>
                {preview.changes.map((c, i) => (
                  <tr key={i}>
                    <td>{c.name}</td>
                    <td className="num">{money(c.beforeCents)}</td>
                    <td className="num">{money(c.afterCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p>
            Total: {money(preview.live.totalCents)} → <strong>{money(preview.totalCents)}</strong>
          </p>
          <form action={reactivate.bind(null, detail.quote.id)}>
            <button type="submit">Reactivar</button>
          </form>
        </>
      )}
      <p>
        <Link href={`/app/quotes/${detail.quote.id}`}>Volver</Link>
      </p>
    </div>
  );
}
