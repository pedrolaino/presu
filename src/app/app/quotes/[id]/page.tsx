import Link from "next/link";
import { notFound } from "next/navigation";
import { QuoteDocument } from "@/components/quote-document";
import { db } from "@/db";
import { formatQuoteNumber } from "@/domain/share";
import { displayStatus } from "@/domain/status";
import { diffItems, latestVersion, liveVersion } from "@/domain/versions";
import { eventLabels, formatDateTime, statusLabels } from "@/lib/labels";
import { formatMoney, formatQuantity } from "@/lib/numbers";
import { duplicate, markAsSent } from "@/server/actions/quotes";
import { getQuote } from "@/server/data/quotes";
import { requireBusiness } from "@/server/session";

const errors: Record<string, string> = {
  send: "La fecha de validez ya pasó. Editá el presupuesto y cambiala antes de enviarlo.",
  reactivate: "Solo se pueden reactivar presupuestos vencidos.",
  generic: "No se pudo completar la acción.",
};

export default async function QuoteDetail({ params, searchParams }: PageProps<"/app/quotes/[id]">) {
  const { business } = await requireBusiness();
  const { id } = await params;
  const { error } = await searchParams;
  const detail = await getQuote(db, business.id, id);
  if (!detail) notFound();

  const { quote, versions, events } = detail;
  const now = new Date();
  const latest = latestVersion(versions)!;
  const live = liveVersion(versions)!;
  const status = displayStatus({ status: quote.status, validUntil: live.validUntil }, now);
  const editable = quote.status !== "accepted" && quote.status !== "rejected";

  return (
    <div className="stack">
      <h1>
        Presupuesto {formatQuoteNumber(quote.number)} · {latest.client.name}
      </h1>
      <p>
        Estado: <strong data-status={status}>{statusLabels[status]}</strong>
        {quote.status === "accepted" && quote.acceptedByName && (
          <>
            {" "}
            · Aceptado por {quote.acceptedByName} (versión {quote.acceptedVersion})
          </>
        )}
        {quote.status === "rejected" && quote.rejectionReason && (
          <> · Motivo: {quote.rejectionReason}</>
        )}
      </p>
      {typeof error === "string" && errors[error] && <p role="alert">{errors[error]}</p>}

      <div className="actions">
        {editable && <Link href={`/app/quotes/${quote.id}/edit`}>Editar</Link>}
        {editable && latest.sentAt === null && (
          <form action={markAsSent.bind(null, quote.id)}>
            <button type="submit">Marcar como enviado</button>
          </form>
        )}
        <a href={`/app/quotes/${quote.id}/pdf`}>Descargar PDF</a>
        <form action={duplicate.bind(null, quote.id)}>
          <button type="submit">Duplicar</button>
        </form>
      </div>

      <section className="stack" aria-labelledby="content-title">
        <h2 id="content-title">
          Versión {latest.version}
          {latest.sentAt ? "" : " (sin enviar)"}
        </h2>
        {latest.version !== live.version && (
          <p role="note">
            El cliente sigue viendo la versión {live.version} hasta que envíes esta.
          </p>
        )}
        <QuoteDocument version={latest} />
      </section>

      {versions.length > 1 && (
        <section className="stack" aria-labelledby="versions-title">
          <h2 id="versions-title">Versiones</h2>
          <ol>
            {versions.map((v, i) => {
              const changes = i === 0 ? [] : diffItems(versions[i - 1].items, v.items);
              return (
                <li key={v.id}>
                  Versión {v.version} · {formatMoney(v.totalCents, v.currency)}
                  {v.sentAt ? ` · enviada el ${formatDateTime(v.sentAt)}` : " · sin enviar"}
                  {changes.length > 0 && (
                    <ul>
                      {changes.map((c, j) => (
                        <li key={j}>
                          {c.kind === "added" && `Se agregó ${c.name}`}
                          {c.kind === "removed" && `Se quitó ${c.name}`}
                          {c.kind === "changed" &&
                            `${c.name}: ${formatQuantity(c.before.quantityHundredths)} × ${formatMoney(c.before.unitPriceCents, v.currency)} → ${formatQuantity(c.after.quantityHundredths)} × ${formatMoney(c.after.unitPriceCents, v.currency)}`}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <section className="stack" aria-labelledby="timeline-title">
        <h2 id="timeline-title">Historial</h2>
        <ol className="timeline">
          {events.map((e) => (
            <li key={e.id}>
              <time dateTime={e.createdAt.toISOString()}>{formatDateTime(e.createdAt)}</time> ·{" "}
              {eventLabels[e.type]}
              {e.version && e.type !== "created" ? ` (versión ${e.version})` : ""}
              {e.detail ? ` · ${e.detail}` : ""}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
