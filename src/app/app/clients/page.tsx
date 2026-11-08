import Link from "next/link";
import { db } from "@/db";
import { listClients } from "@/server/data/clients";
import { requireBusiness } from "@/server/session";

export default async function Clients({ searchParams }: PageProps<"/app/clients">) {
  const { business } = await requireBusiness();
  const { q } = await searchParams;
  const search = typeof q === "string" ? q.slice(0, 100) : "";
  const rows = await listClients(db, business.id, search);

  return (
    <div className="stack">
      <h1>Clientes</h1>
      <p>
        <Link href="/app/clients/new">Nuevo cliente</Link>
      </p>
      <form role="search" className="actions">
        <label htmlFor="q">Buscar</label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={search}
          placeholder="Nombre, email o teléfono"
        />
        <button type="submit">Buscar</button>
      </form>
      {rows.length === 0 ? (
        <p>{search ? "No hay clientes que coincidan." : "Todavía no cargaste clientes."}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th scope="col">Nombre</th>
              <th scope="col">Teléfono</th>
              <th scope="col">Email</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link href={`/app/clients/${c.id}`}>{c.name}</Link>
                </td>
                <td>{c.phone}</td>
                <td>{c.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
