import Link from "next/link";
import { db } from "@/db";
import { acceptanceRate, acceptedByMonth, averageResponseMs, expiringSoon } from "@/domain/metrics";
import { formatQuoteNumber } from "@/domain/share";
import { formatDate, statusLabels } from "@/lib/labels";
import { formatMoney } from "@/lib/numbers";
import { listQuotes } from "@/server/data/quotes";
import { requireBusiness } from "@/server/session";

const monthName = new Intl.DateTimeFormat("es-AR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const decimal = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

function formatDuration(ms: number) {
  const hours = ms / 3_600_000;
  return hours < 24 ? `${decimal.format(hours)} h` : `${decimal.format(hours / 24)} días`;
}

export default async function Metrics() {
  const { business } = await requireBusiness();
  const now = new Date();
  const rows = (await listQuotes(db, business.id, now)).map((r) => ({
    ...r,
    sentAt: r.firstSentAt,
  }));
  const rate = acceptanceRate(rows, now);
  const closed = rows.filter((r) => ["accepted", "rejected", "expired"].includes(r.displayStatus));
  const response = averageResponseMs(rows);
  const soon = expiringSoon(rows, now).sort((a, b) => a.validUntil.localeCompare(b.validUntil));
  const months = acceptedByMonth(rows).reverse();

  return (
    <div className="stack">
      <h1>Métricas</h1>
      <dl className="stats">
        <div>
          <dt>Tasa de aceptación</dt>
          <dd>{rate === null ? "—" : `${decimal.format(rate * 100)} %`}</dd>
          <dd>
            <small>
              {rate === null
                ? "Todavía no hay presupuestos cerrados."
                : `${rows.filter((r) => r.status === "accepted").length} aceptados de ${closed.length} cerrados (aceptados, rechazados o vencidos).`}
            </small>
          </dd>
        </div>
        <div>
          <dt>Tiempo promedio de respuesta</dt>
          <dd>{response === null ? "—" : formatDuration(response)}</dd>
          <dd>
            <small>Desde que lo enviás hasta que el cliente acepta o rechaza.</small>
          </dd>
        </div>
      </dl>

      <section className="stack" aria-labelledby="soon-title">
        <h2 id="soon-title">Vencen en los próximos 7 días</h2>
        {soon.length === 0 ? (
          <p>Ninguno.</p>
        ) : (
          <ul>
            {soon.map((q) => (
              <li key={q.id}>
                <Link href={`/app/quotes/${q.id}`}>{formatQuoteNumber(q.number)}</Link> ·{" "}
                {q.clientName} · {statusLabels[q.displayStatus]} · vence el{" "}
                {formatDate(q.validUntil)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="stack" aria-labelledby="months-title">
        <h2 id="months-title">Monto aceptado por mes</h2>
        {months.length === 0 ? (
          <p>Todavía no hay presupuestos aceptados.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Mes</th>
                  <th scope="col" className="num">
                    Pesos
                  </th>
                  <th scope="col" className="num">
                    Dólares
                  </th>
                </tr>
              </thead>
              <tbody>
                {months.map((m) => (
                  <tr key={m.month}>
                    <td>{monthName.format(new Date(`${m.month}-01T00:00:00Z`))}</td>
                    <td className="num">{m.ARS ? formatMoney(m.ARS, "ARS") : "—"}</td>
                    <td className="num">{m.USD ? formatMoney(m.USD, "USD") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
