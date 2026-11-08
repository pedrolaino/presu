import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { BusinessForm } from "@/components/business-form";
import { config } from "@/config";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { requireUser } from "@/server/session";

export default async function Onboarding() {
  const user = await requireUser();
  const existing = await db.query.businesses.findFirst({ where: eq(businesses.userId, user.id) });
  if (existing) redirect("/app/quotes");

  return (
    <main className="reading stack">
      <h1>Datos de tu negocio</h1>
      <p className="muted">Aparecen en tus presupuestos. Podés cambiarlos cuando quieras.</p>
      <section className="panel">
        <BusinessForm
          onboarding
          values={{
            name: "",
            phone: "",
            email: user.email,
            address: "",
            taxId: "",
            defaultTerms: "",
            defaultValidityDays: config.defaultValidityDays,
            logoDataUrl: null,
          }}
        />
      </section>
    </main>
  );
}
