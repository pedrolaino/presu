import { notFound, redirect } from "next/navigation";
import { QuoteEditor } from "@/components/quote-editor";
import { db } from "@/db";
import { formatQuoteNumber } from "@/domain/share";
import { latestVersion } from "@/domain/versions";
import { saveQuote } from "@/server/actions/quotes";
import { editorOptions, editorValues } from "@/server/data/editor";
import { getQuote } from "@/server/data/quotes";
import { requireBusiness } from "@/server/session";

export default async function EditQuote({ params }: PageProps<"/app/quotes/[id]/edit">) {
  const { business } = await requireBusiness();
  const { id } = await params;
  const detail = await getQuote(db, business.id, id);
  if (!detail) notFound();
  const { quote, versions } = detail;
  if (quote.status === "accepted" || quote.status === "rejected") redirect(`/app/quotes/${id}`);
  const latest = latestVersion(versions)!;

  return (
    <div className="stack">
      <h1>Editar presupuesto {formatQuoteNumber(quote.number)}</h1>
      {latest.sentAt && (
        <p role="note">
          Este presupuesto ya se envió. Al guardar se crea la versión {latest.version + 1}; el
          cliente la ve cuando la envíes.
        </p>
      )}
      <QuoteEditor
        {...await editorOptions(db, business.id)}
        action={saveQuote.bind(null, quote.id)}
        submitLabel="Guardar"
        initial={editorValues(latest, quote.clientId)}
      />
    </div>
  );
}
