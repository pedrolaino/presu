import { CheckCircle, Copy, DownloadSimple, PencilSimple } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { notFound } from "next/navigation";
import { QuoteDocument } from "@/components/quote-document";
import { StatusBadge } from "@/components/status-badge";
import { db } from "@/db";
import { formatQuoteNumber } from "@/domain/share";
import { displayStatus } from "@/domain/status";
import { diffItems, latestVersion, liveVersion } from "@/domain/versions";
import { eventLabels, formatDateTime } from "@/lib/labels";
import { formatMoney, formatQuantity } from "@/lib/numbers";
import { ShareButtons } from "@/components/share-buttons";
import { duplicate, markAsSent, regenerateLink, revokeLink } from "@/server/actions/quotes";
import { getQuote } from "@/server/data/quotes";
import { appOrigin, requireBusiness } from "@/server/session";

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
  const url = quote.shareToken ? `${await appOrigin()}/p/${quote.shareToken}` : null;
  const number = formatQuoteNumber(quote.number);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{latest.client.name}</h1>
          <div className="actions" style={{ marginTop: "var(--s2)" }}>
            <span className="muted">Presupuesto {number}</span>
            <StatusBadge status={status} />
          </div>
        </div>
        <div className="actions">
          {status === "expired" && (
            <Link href={`/app/quotes/${quote.id}/reactivate`} className="btn">
              Reactivar
            </Link>
          )}
          {editable && latest.sentAt === null && (
            <form action={markAsSent.bind(null, quote.id)}>
              <button type="submit">Marcar como enviado</button>
            </form>
          )}
          {editable && (
            <Link href={`/app/quotes/${quote.id}/edit`} className="btn btn-secondary">
              <PencilSimple size={18} aria-hidden className="ic" />
              Editar
            </Link>
          )}
          <a href={`/app/quotes/${quote.id}/pdf`} className="btn btn-secondary">
            <DownloadSimple size={18} aria-hidden className="ic" />
            Descargar PDF
          </a>
          <form action={duplicate.bind(null, quote.id)}>
            <button type="submit" className="btn-secondary">
              <Copy size={18} aria-hidden className="ic" />
              Duplicar
            </button>
          </form>
        </div>
      </div>

      {typeof error === "string" && errors[error] && (
        <p className="alert" role="alert" style={{ marginBottom: "var(--s5)" }}>
          {errors[error]}
        </p>
      )}

      <div className="editor">
        <div className="stack-lg">
          {quote.status === "accepted" && quote.respondedAt && (
            <div className="signature">
              <CheckCircle size={28} weight="duotone" aria-hidden className="ic" />
              <p>
                Aceptado el {formatDateTime(quote.respondedAt)} (versión {quote.acceptedVersion})
                <span className="signature-name">{quote.acceptedByName}</span>
              </p>
            </div>
          )}
          {quote.status === "rejected" && (
            <p className="notice">
              Rechazado{quote.respondedAt && ` el ${formatDateTime(quote.respondedAt)}`}.
              {quote.rejectionReason && ` Motivo: “${quote.rejectionReason}”`}
            </p>
          )}

          <section className="stack" aria-labelledby="content-title">
            <h2 id="content-title">
              Versión {latest.version}
              {latest.sentAt ? "" : ", sin enviar"}
            </h2>
            {latest.version !== live.version && (
              <p className="notice notice-clay" role="note">
                El cliente sigue viendo la versión {live.version} hasta que envíes esta.
              </p>
            )}
            <QuoteDocument version={latest} />
          </section>

          {versions.length > 1 && (
            <section className="stack" aria-labelledby="versions-title">
              <h2 id="versions-title">Versiones</h2>
              <ol className="timeline">
                {versions.map((v, i) => {
                  const changes = i === 0 ? [] : diffItems(versions[i - 1].items, v.items);
                  return (
                    <li key={v.id}>
                      <strong>Versión {v.version}</strong>, {formatMoney(v.totalCents, v.currency)}
                      <time dateTime={v.sentAt?.toISOString()}>
                        {v.sentAt ? `Enviada el ${formatDateTime(v.sentAt)}` : "Sin enviar"}
                      </time>
                      {changes.length > 0 && (
                        <ul className="muted">
                          {changes.map((c, j) => (
                            <li key={j}>
                              {c.kind === "added" && `Se agregó ${c.name}`}
                              {c.kind === "removed" && `Se quitó ${c.name}`}
                              {c.kind === "changed" &&
                                `${c.name}: ${formatQuantity(c.before.quantityHundredths)} × ${formatMoney(c.before.unitPriceCents, v.currency)} pasó a ${formatQuantity(c.after.quantityHundredths)} × ${formatMoney(c.after.unitPriceCents, v.currency)}`}
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
        </div>

        <aside className="editor-side detail-side stack">
          <section className="panel stack detail-share" aria-labelledby="share-title">
            <h2 id="share-title">Compartir</h2>
            {url ? (
              <>
                <div className="field">
                  <label htmlFor="share-url">Link para el cliente</label>
                  <input id="share-url" readOnly value={url} />
                </div>
                <ShareButtons
                  quoteId={quote.id}
                  url={url}
                  pdfName={`presupuesto-${number.slice(1)}.pdf`}
                  message={`¡Hola ${latest.client.name}! Te paso el presupuesto ${number} de ${business.name}. Lo podés ver y aceptar desde acá: ${url}`}
                />
                <form action={revokeLink.bind(null, quote.id)}>
                  <button type="submit" className="btn-secondary">
                    Desactivar link
                  </button>
                </form>
              </>
            ) : (
              <>
                <p>El link está desactivado: nadie puede ver el presupuesto.</p>
                <form action={regenerateLink.bind(null, quote.id)}>
                  <button type="submit">Generar link nuevo</button>
                </form>
              </>
            )}
          </section>

          <section className="panel" aria-labelledby="timeline-title">
            <h2 id="timeline-title">Historial</h2>
            <ol className="timeline">
              {events.map((e) => (
                <li key={e.id}>
                  {eventLabels[e.type]}
                  {e.version && e.type !== "created" ? `, versión ${e.version}` : ""}
                  {e.detail && <span className="muted">: {e.detail}</span>}
                  <time dateTime={e.createdAt.toISOString()}>{formatDateTime(e.createdAt)}</time>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </>
  );
}
