import Link from "next/link";
import { db } from "@/db";
import type { DisplayStatus } from "@/domain/status";
import { formatQuoteNumber } from "@/domain/share";
import { formatDate, statusLabels } from "@/lib/labels";
import { formatMoney } from "@/lib/numbers";
import { listQuotes } from "@/server/data/quotes";
import { requireBusiness } from "@/server/session";

export default async function Quotes({ searchParams }: PageProps<"/app/quotes">) {
  const { business } = await requireBusiness();
  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  const status = Object.keys(statusLabels).find((s) => s === params.status) as
    DisplayStatus | undefined;
  const rows = await listQuotes(db, business.id, new Date(), { status, search });

  return (
    <div className="stack">
      <h1>Presupuestos</h1>
      <p>
        <Link href="/app/quotes/new">Nuevo presupuesto</Link>
      </p>
      <form role="search" className="actions">
        <label htmlFor="q">Cliente</label>
        <input id="q" name="q" type="search" defaultValue={search} />
        <label htmlFor="status">Estado</label>
        <select id="status" name="status" defaultValue={status ?? ""}>
          <option value="">Todos</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button type="submit">Filtrar</button>
      </form>
      {rows.length === 0 ? (
        <p>
          {search || status
            ? "No hay presupuestos que coincidan."
            : "Todavía no armaste presupuestos."}
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              <th scope="col">Número</th>
              <th scope="col">Cliente</th>
              <th scope="col">Estado</th>
              <th scope="col">Válido hasta</th>
              <th scope="col" className="num">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((q) => (
              <tr key={q.id}>
                <td>
                  <Link href={`/app/quotes/${q.id}`}>{formatQuoteNumber(q.number)}</Link>
                </td>
                <td>{q.clientName}</td>
                <td>{statusLabels[q.displayStatus]}</td>
                <td>{formatDate(q.validUntil)}</td>
                <td className="num">{formatMoney(q.totalCents, q.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
