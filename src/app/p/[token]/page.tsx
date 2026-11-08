import {
  CheckCircle,
  Clock,
  DownloadSimple,
  EnvelopeSimple,
  HourglassMedium,
  MapPin,
  Phone,
} from "@phosphor-icons/react/ssr";
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
      <main className="reading">
        <p className="alert" role="alert">
          Hubo demasiadas visitas seguidas. Esperá un minuto y recargá la página.
        </p>
      </main>
    );
  }
  const found = await getPublicQuote(db, token);
  if (!found) notFound();

  const { quote, business, version } = found;
  const expired = isExpired({ status: quote.status, validUntil: version.validUntil }, new Date());
  const logo = logoDataUrl(business.logo);

  const initials = business.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const open = (quote.status === "sent" || quote.status === "viewed") && !expired;

  return (
    <main className="reading stack-lg">
      <ViewTracker token={token} />
      <header className="issuer">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt={`Logo de ${business.name}`} className="issuer-logo" />
        ) : (
          <span className="monogram" aria-hidden>
            {initials}
          </span>
        )}
        <div>
          <p>
            <strong>{business.name}</strong>
          </p>
          <p className="contact">
            {business.phone && (
              <span>
                <Phone size={16} aria-hidden className="ic" />
                <a href={`tel:${business.phone.replace(/[^\d+]/g, "")}`}>{business.phone}</a>
              </span>
            )}
            {business.email && (
              <span>
                <EnvelopeSimple size={16} aria-hidden className="ic" />
                {business.email}
              </span>
            )}
            {business.address && (
              <span>
                <MapPin size={16} aria-hidden className="ic" />
                {business.address}
              </span>
            )}
          </p>
        </div>
      </header>

      <div className="stack">
        <p className="muted">Presupuesto {formatQuoteNumber(quote.number)}</p>
        <h1>Para {version.client.name}</h1>
        {open && (
          <p className="notice">
            <Clock size={20} aria-hidden className="ic" />
            <span>
              Válido hasta el <strong>{formatDate(version.validUntil)}</strong>.
            </span>
          </p>
        )}
        {expired && (
          <p className="notice notice-clay" role="status">
            <HourglassMedium size={20} aria-hidden className="ic" />
            <span>
              Este presupuesto venció el {formatDate(version.validUntil)}. Pedile uno actualizado a{" "}
              {business.name}.
            </span>
          </p>
        )}
        {quote.status === "rejected" && (
          <p className="notice" role="status">
            Este presupuesto fue rechazado.
          </p>
        )}
      </div>

      <QuoteDocument version={version} />

      {quote.status === "accepted" && quote.respondedAt && (
        <div className="signature" role="status">
          <CheckCircle size={28} weight="duotone" aria-hidden className="ic" />
          <p>
            Aceptado el {formatDateTime(quote.respondedAt)} por
            <span className="signature-name">{quote.acceptedByName}</span>
          </p>
        </div>
      )}

      {open && <RespondForms token={token} version={version.version} />}

      <p>
        <a href={`/p/${token}/pdf`} className="btn btn-secondary">
          <DownloadSimple size={18} aria-hidden className="ic" />
          Descargar PDF
        </a>
      </p>
    </main>
  );
}
