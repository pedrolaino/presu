import { CatalogForm } from "@/components/catalog-form";
import { db } from "@/db";
import { saveCatalogItem } from "@/server/actions/catalog";
import { listCategories } from "@/server/data/catalog";
import { requireBusiness } from "@/server/session";

export default async function NewCatalogItem() {
  const { business } = await requireBusiness();
  return (
    <div className="stack">
      <h1>Nuevo ítem</h1>
      <CatalogForm
        action={saveCatalogItem.bind(null, null)}
        categories={await listCategories(db, business.id)}
        submitLabel="Crear ítem"
        values={{
          name: "",
          description: "",
          unit: "unidad",
          priceCents: "",
          currency: "ARS",
          vatRateBps: 2100,
          category: "",
          active: true,
        }}
      />
    </div>
  );
}
