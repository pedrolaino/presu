import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QuoteDocument } from "@/components/quote-document";
import { RespondForms } from "@/components/respond-forms";
import { ViewTracker } from "@/components/view-tracker";
import { config } from "@/config";
import { db } from "@/db";
import { formatQuoteNumber } from "@/domain/share";
import { isExpired } from "@/domain/status";
import { formatDate, formatDateTime } from "@/lib/labels";
import { logoDataUrl } from "@/server/logo-url";
import { getPublicQuote } from "@/server/data/public";
import { allowRequest } from "@/server/rate-limit";
import { clientIp } from "@/server/session";

export const metadata: Metadata = {
  title: "Presupuesto",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function PublicQuote({ params }: PageProps<"/p/[token]">) {
  const { token } = await params;
  if (
    !(await allowRequest(db, `page:${await clientIp()}`, config.rateLimits.publicView, new Date()))
  ) {
    return (
      <main className="page">
        <p role="alert">Hubo demasiadas visitas seguidas. Esperá un minuto y recargá la página.</p>
      </main>
    );
  }
  const found = await getPublicQuote(db, token);
  if (!found) notFound();

  const { quote, business, version } = found;
  const expired = isExpired({ status: quote.status, validUntil: version.validUntil }, new Date());
  const logo = logoDataUrl(business.logo);

  return (
    <main className="page stack">
      <ViewTracker token={token} />
      <header className="stack">
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt={`Logo de ${business.name}`} width={96} />
        )}
        <p>
          <strong>{business.name}</strong>
          {[business.phone, business.email, business.address].filter(Boolean).map((line) => (
            <span key={line}>
              <br />
              {line}
            </span>
          ))}
        </p>
        <h1>
          Presupuesto {formatQuoteNumber(quote.number)} para {version.client.name}
        </h1>
      </header>

      {quote.status === "accepted" && quote.respondedAt && (
        <p role="status">
          Aceptado por {quote.acceptedByName} el {formatDateTime(quote.respondedAt)}.
        </p>
      )}
      {quote.status === "rejected" && <p role="status">Este presupuesto fue rechazado.</p>}
      {expired && (
        <p role="status">
          Este presupuesto venció el {formatDate(version.validUntil)}. Pedile uno actualizado a{" "}
          {business.name}.
        </p>
      )}

      <QuoteDocument version={version} />

      <p>
        <a href={`/p/${token}/pdf`}>Descargar PDF</a>
      </p>

      {(quote.status === "sent" || quote.status === "viewed") && !expired && (
        <RespondForms token={token} version={version.version} />
      )}
    </main>
  );
}
