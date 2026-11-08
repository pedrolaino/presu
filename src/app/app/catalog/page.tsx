import Link from "next/link";
import { db } from "@/db";
import { formatMoney, formatPercent } from "@/lib/numbers";
import { listCatalog, listCategories } from "@/server/data/catalog";
import { requireBusiness } from "@/server/session";

export default async function Catalog({ searchParams }: PageProps<"/app/catalog">) {
  const { business } = await requireBusiness();
  const params = await searchParams;
  const str = (v: unknown) => (typeof v === "string" ? v.slice(0, 100) : "");
  const search = str(params.q);
  const category = str(params.category);
  const [items, categories] = await Promise.all([
    listCatalog(db, business.id, { search, category }),
    listCategories(db, business.id),
  ]);

  return (
    <div className="stack">
      <h1>Catálogo</h1>
      <p className="actions">
        <Link href="/app/catalog/new">Nuevo ítem</Link>
        <Link href="/app/catalog/increase">Aumentar precios</Link>
      </p>
      {params.updated && (
        <p role="status">
          {params.updated === "1"
            ? "Se actualizó 1 precio."
            : `Se actualizaron ${str(params.updated)} precios.`}
        </p>
      )}
      <form role="search" className="actions">
        <label htmlFor="q">Buscar</label>
        <input id="q" name="q" type="search" defaultValue={search} />
        <label htmlFor="category">Categoría</label>
        <select id="category" name="category" defaultValue={category}>
          <option value="">Todas</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <button type="submit">Filtrar</button>
      </form>
      {items.length === 0 ? (
        <p>No hay ítems para mostrar.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th scope="col">Nombre</th>
              <th scope="col">Categoría</th>
              <th scope="col">Unidad</th>
              <th scope="col" className="num">
                Precio
              </th>
              <th scope="col" className="num">
                IVA
              </th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td>
                  <Link href={`/app/catalog/${i.id}`}>{i.name}</Link>
                </td>
                <td>{i.category}</td>
                <td>{i.unit}</td>
                <td className="num">{formatMoney(i.priceCents, i.currency)}</td>
                <td className="num">{formatPercent(i.vatRateBps)}</td>
                <td>{i.active ? "Activo" : "Inactivo"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
