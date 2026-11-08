import { Plus, TrendUp } from "@phosphor-icons/react/ssr";
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
    <>
      <div className="page-head">
        <h1>Catálogo</h1>
        <div className="actions">
          <Link href="/app/catalog/increase" className="btn btn-secondary">
            <TrendUp size={18} aria-hidden className="ic" />
            Aumentar precios
          </Link>
          <Link href="/app/catalog/new" className="btn">
            <Plus size={18} weight="bold" aria-hidden className="ic" />
            Nuevo ítem
          </Link>
        </div>
      </div>
      {params.updated && (
        <p className="notice notice-green" role="status" style={{ marginBottom: "var(--s5)" }}>
          {params.updated === "1"
            ? "Se actualizó 1 precio."
            : `Se actualizaron ${str(params.updated)} precios.`}
        </p>
      )}
      <form role="search" className="toolbar">
        <div className="field">
          <label htmlFor="q">Buscar</label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={search}
            placeholder="Nombre o descripción"
          />
        </div>
        <div className="field field-narrow">
          <label htmlFor="category">Categoría</label>
          <select id="category" name="category" defaultValue={category}>
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-secondary">
          Filtrar
        </button>
      </form>
      {items.length === 0 ? (
        <p className="notice">
          {search || category
            ? "No hay ítems que coincidan."
            : "Todavía no cargaste tu lista de precios."}
        </p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Nombre</th>
                <th scope="col" className="hide-sm">
                  Categoría
                </th>
                <th scope="col" className="num">
                  Precio
                </th>
                <th scope="col" className="num hide-sm">
                  IVA
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td>
                    <Link href={`/app/catalog/${i.id}`}>{i.name}</Link>
                    {!i.active && <span className="muted"> (inactivo)</span>}
                  </td>
                  <td className="hide-sm muted">{i.category}</td>
                  <td className="num">
                    {formatMoney(i.priceCents, i.currency)}
                    <small style={{ display: "block" }}>por {i.unit}</small>
                  </td>
                  <td className="num hide-sm">{formatPercent(i.vatRateBps)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
