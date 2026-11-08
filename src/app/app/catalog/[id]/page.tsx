import { notFound } from "next/navigation";
import { CatalogForm } from "@/components/catalog-form";
import { db } from "@/db";
import { toFixed2 } from "@/lib/numbers";
import { removeCatalogItem, saveCatalogItem } from "@/server/actions/catalog";
import { getCatalogItem, listCategories } from "@/server/data/catalog";
import { requireBusiness } from "@/server/session";

export default async function EditCatalogItem({ params }: PageProps<"/app/catalog/[id]">) {
  const { business } = await requireBusiness();
  const { id } = await params;
  const item = await getCatalogItem(db, business.id, id);
  if (!item) notFound();

  return (
    <div className="stack-lg form-page">
      <h1>{item.name}</h1>
      <CatalogForm
        action={saveCatalogItem.bind(null, item.id)}
        categories={await listCategories(db, business.id)}
        submitLabel="Guardar"
        values={{ ...item, priceCents: toFixed2(item.priceCents) }}
      />
      <form action={removeCatalogItem.bind(null, item.id)}>
        <button type="submit" className="btn-danger">
          Borrar ítem
        </button>
      </form>
      <p>
        <small>Los presupuestos ya armados conservan sus precios.</small>
      </p>
    </div>
  );
}
