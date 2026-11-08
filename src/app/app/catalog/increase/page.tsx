import Link from "next/link";
import { db } from "@/db";
import { PriceTooLargeError } from "@/domain/pricing";
import { formatMoney, formatPercent } from "@/lib/numbers";
import { applyIncrease } from "@/server/actions/catalog";
import { listCatalog, listCategories, previewBulkIncrease } from "@/server/data/catalog";
import { parseIncrease } from "@/server/increase";
import { requireBusiness } from "@/server/session";

export default async function IncreasePrices({ searchParams }: PageProps<"/app/catalog/increase">) {
  const { business } = await requireBusiness();
  const params = await searchParams;
  const ids = ([] as string[]).concat(params.id ?? []);
  const request = parseIncrease({ percent: params.percent ?? "", category: params.category, ids });
  let tooLarge = params.error === "too-large";
  const [items, categories, preview] = await Promise.all([
    listCatalog(db, business.id),
    listCategories(db, business.id),
    request
      ? previewBulkIncrease(db, business.id, request.selection, request.bps).catch((e) => {
          if (!(e instanceof PriceTooLargeError)) throw e;
          tooLarge = true;
          return null;
        })
      : null,
  ]);
  const asked = params.percent !== undefined;

  return (
    <div className="stack-lg form-page">
      <div className="stack">
        <h1>Aumentar precios</h1>
        <p className="muted">
          Cambia los precios del catálogo. Los presupuestos que ya armaste no se tocan.
        </p>
      </div>

      <form className="panel stack">
        <div className="field">
          <label htmlFor="percent">Porcentaje</label>
          <input
            id="percent"
            name="percent"
            required
            inputMode="decimal"
            defaultValue={params.percent ?? ""}
            aria-describedby="percent-hint"
          />
          <small id="percent-hint">
            Ejemplo: 8 o 12,5. Para bajar precios, poné un número negativo.
          </small>
        </div>
        <div className="field">
          <label htmlFor="category">Aplicar a una categoría</label>
          <select
            id="category"
            name="category"
            defaultValue={typeof params.category === "string" ? params.category : ""}
          >
            <option value="">Elegir ítems a mano</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <fieldset>
          <legend>O elegí los ítems</legend>
          {items.map((i) => (
            <label key={i.id} className="check">
              <input type="checkbox" name="id" value={i.id} defaultChecked={ids.includes(i.id)} />
              {i.name}
            </label>
          ))}
        </fieldset>
        <div>
          <button type="submit" className="btn-secondary">
            Ver vista previa
          </button>
        </div>
      </form>

      {tooLarge && (
        <p className="alert" role="alert">
          Con ese porcentaje algún precio pasaría de $ 999.999.999.999,99, el máximo permitido. No
          se cambió ningún precio.
        </p>
      )}

      {asked && !request && (
        <p className="alert" role="alert">
          Poné un porcentaje y elegí una categoría o algunos ítems.
        </p>
      )}

      {request && preview && (
        <section className="stack" aria-labelledby="preview-title">
          <h2 id="preview-title">Vista previa con {formatPercent(request.bps)}</h2>
          {preview.length === 0 ? (
            <p>No hay ítems en esa selección.</p>
          ) : (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Ítem</th>
                      <th scope="col" className="num">
                        Antes
                      </th>
                      <th scope="col" className="num">
                        Después
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((p) => (
                      <tr key={p.id}>
                        <td>{p.name}</td>
                        <td className="num">{formatMoney(p.beforeCents, p.currency)}</td>
                        <td className="num">{formatMoney(p.afterCents, p.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <form action={applyIncrease}>
                <input type="hidden" name="percent" value={String(params.percent)} />
                {"category" in request.selection ? (
                  <input type="hidden" name="category" value={request.selection.category} />
                ) : (
                  request.selection.ids.map((id) => (
                    <input key={id} type="hidden" name="id" value={id} />
                  ))
                )}
                <button type="submit">Aplicar a {preview.length} ítems</button>
              </form>
            </>
          )}
        </section>
      )}
      <p>
        <Link href="/app/catalog">Volver al catálogo</Link>
      </p>
    </div>
  );
}
