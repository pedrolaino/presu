import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { db } from "@/db";
import { acceptanceRate, acceptedByMonth, averageResponseMs, expiringSoon } from "@/domain/metrics";
import { formatQuoteNumber } from "@/domain/share";
import { formatDate } from "@/lib/labels";
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

  const maxArs = Math.max(0, ...months.map((m) => m.ARS));
  const maxUsd = Math.max(0, ...months.map((m) => m.USD));
  const bar = (value: number, max: number) =>
    value > 0 && <span className="bar" style={{ width: `${(value / max) * 100}%` }} aria-hidden />;

  return (
    <div className="stack-lg">
      <h1>Métricas</h1>
      <dl className="stats">
        <div className="panel stat">
          <dt>Tasa de aceptación</dt>
          <dd className="stat-value">
            {rate === null ? "Sin datos" : `${decimal.format(rate * 100)} %`}
          </dd>
          <dd className="muted">
            {rate === null
              ? "Todavía no hay presupuestos cerrados."
              : `${rows.filter((r) => r.status === "accepted").length} aceptados de ${closed.length} cerrados (aceptados, rechazados o vencidos).`}
          </dd>
        </div>
        <div className="panel stat">
          <dt>Tiempo promedio de respuesta</dt>
          <dd className="stat-value">
            {response === null ? "Sin datos" : formatDuration(response)}
          </dd>
          <dd className="muted">Desde que lo enviás hasta que el cliente acepta o rechaza.</dd>
        </div>
      </dl>

      <section className="stack" aria-labelledby="soon-title">
        <h2 id="soon-title">Vencen en los próximos 7 días</h2>
        {soon.length === 0 ? (
          <p className="notice">Ningún presupuesto abierto vence esta semana.</p>
        ) : (
          <ul className="rows">
            {soon.map((q) => (
              <li key={q.id}>
                <Link href={`/app/quotes/${q.id}`} className="row">
                  <span className="row-number">{formatQuoteNumber(q.number)}</span>
                  <span className="row-title">{q.clientName}</span>
                  <StatusBadge status={q.displayStatus} />
                  <span className="row-meta">Vence el {formatDate(q.validUntil)}</span>
                  <span className="row-amount">{formatMoney(q.totalCents, q.currency)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="stack" aria-labelledby="months-title">
        <h2 id="months-title">Monto aceptado por mes</h2>
        {months.length === 0 ? (
          <p className="notice">Todavía no hay presupuestos aceptados.</p>
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
                    <td className="num" style={{ width: "40%" }}>
                      {m.ARS ? formatMoney(m.ARS, "ARS") : "Sin aceptados"}
                      {bar(m.ARS, maxArs)}
                    </td>
                    <td className="num" style={{ width: "30%" }}>
                      {m.USD ? formatMoney(m.USD, "USD") : "Sin aceptados"}
                      {bar(m.USD, maxUsd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted">Cada moneda se suma por separado; no se convierten entre sí.</p>
      </section>
    </div>
  );
}
