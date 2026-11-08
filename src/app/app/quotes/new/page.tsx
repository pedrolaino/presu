import { QuoteEditor } from "@/components/quote-editor";
import { db } from "@/db";
import { addDays, todayInArgentina } from "@/domain/dates";
import { saveQuote } from "@/server/actions/quotes";
import { editorOptions } from "@/server/data/editor";
import { requireBusiness } from "@/server/session";

export default async function NewQuote() {
  const { business } = await requireBusiness();
  const options = await editorOptions(db, business.id);
  return (
    <div className="stack">
      <h1>Nuevo presupuesto</h1>
      <QuoteEditor
        {...options}
        action={saveQuote.bind(null, null)}
        submitLabel="Crear presupuesto"
        initial={{
          client: options.clients[0]
            ? { kind: "existing", id: options.clients[0].id }
            : { kind: "new", data: { name: "", email: "", phone: "", address: "" } },
          items: [],
          discount: { kind: "none", value: "" },
          vatMode: "added",
          currency: "ARS",
          validUntil: addDays(todayInArgentina(new Date()), business.defaultValidityDays),
          notes: "",
          terms: business.defaultTerms,
        }}
      />
    </div>
  );
}
