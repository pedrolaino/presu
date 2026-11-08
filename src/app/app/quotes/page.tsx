import { Plus } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { db } from "@/db";
import { formatQuoteNumber } from "@/domain/share";
import type { DisplayStatus } from "@/domain/status";
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
    <>
      <div className="page-head">
        <h1>Presupuestos</h1>
        <Link href="/app/quotes/new" className="btn">
          <Plus size={18} weight="bold" aria-hidden className="ic" />
          Nuevo presupuesto
        </Link>
      </div>

      <form role="search" className="toolbar">
        <div className="field">
          <label htmlFor="q">Cliente</label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={search}
            placeholder="Buscar por nombre"
          />
        </div>
        <div className="field field-narrow">
          <label htmlFor="status">Estado</label>
          <select id="status" name="status" defaultValue={status ?? ""}>
            <option value="">Todos</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-secondary">
          Filtrar
        </button>
      </form>

      {rows.length === 0 ? (
        <div className="notice">
          {search || status ? (
            <p>No hay presupuestos que coincidan con la búsqueda.</p>
          ) : (
            <p>
              Todavía no armaste presupuestos. <Link href="/app/quotes/new">Armá el primero</Link>.
            </p>
          )}
        </div>
      ) : (
        <ul className="rows" aria-label="Presupuestos">
          {rows.map((q) => (
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
    </>
  );
}
