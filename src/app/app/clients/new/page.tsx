import { ClientForm } from "@/components/client-form";
import { saveClient } from "@/server/actions/clients";

export default function NewClient() {
  return (
    <div className="stack-lg form-page">
      <h1>Nuevo cliente</h1>
      <ClientForm action={saveClient.bind(null, null)} submitLabel="Crear cliente" />
    </div>
  );
}
