import { notFound } from "next/navigation";
import { ClientForm } from "@/components/client-form";
import { db } from "@/db";
import { removeClient, saveClient } from "@/server/actions/clients";
import { getClient } from "@/server/data/clients";
import { requireBusiness } from "@/server/session";

export default async function EditClient({ params }: PageProps<"/app/clients/[id]">) {
  const { business } = await requireBusiness();
  const { id } = await params;
  const client = await getClient(db, business.id, id);
  if (!client) notFound();

  return (
    <div className="stack">
      <h1>{client.name}</h1>
      <ClientForm action={saveClient.bind(null, client.id)} values={client} submitLabel="Guardar" />
      <form action={removeClient.bind(null, client.id)}>
        <button type="submit">Borrar cliente</button>
      </form>
      <p>
        <small>Los presupuestos ya armados conservan los datos del cliente.</small>
      </p>
    </div>
  );
}
