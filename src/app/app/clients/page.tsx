import { Plus } from "@phosphor-icons/react/ssr";
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
    <>
      <div className="page-head">
        <h1>Clientes</h1>
        <Link href="/app/clients/new" className="btn">
          <Plus size={18} weight="bold" aria-hidden className="ic" />
          Nuevo cliente
        </Link>
      </div>
      <form role="search" className="toolbar">
        <div className="field">
          <label htmlFor="q">Buscar</label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={search}
            placeholder="Nombre, email o teléfono"
          />
        </div>
        <button type="submit" className="btn-secondary">
          Buscar
        </button>
      </form>
      {rows.length === 0 ? (
        <p className="notice">
          {search
            ? "No hay clientes que coincidan con la búsqueda."
            : "Todavía no cargaste clientes."}
        </p>
      ) : (
        <ul className="rows" aria-label="Clientes">
          {rows.map((c) => (
            <li key={c.id}>
              <Link href={`/app/clients/${c.id}`} className="row row-simple">
                <span className="row-title">{c.name}</span>
                <span className="row-meta">{[c.phone, c.email].filter(Boolean).join(", ")}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
