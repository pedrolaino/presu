import { BusinessForm } from "@/components/business-form";
import { deleteAccount } from "@/server/auth-actions";
import { logoDataUrl } from "@/server/logo-url";
import { requireBusiness } from "@/server/session";

export default async function Settings({ searchParams }: PageProps<"/app/settings">) {
  const { business } = await requireBusiness();
  const { delete: deleteState } = await searchParams;
  return (
    <div className="stack">
      <h1>Datos del negocio</h1>
      <BusinessForm
        onboarding={false}
        values={{ ...business, logoDataUrl: logoDataUrl(business.logo) }}
      />

      <section className="stack" aria-labelledby="delete-title">
        <h2 id="delete-title">Borrar mi cuenta</h2>
        <p>Se borran tu cuenta y todos sus datos. No se puede deshacer.</p>
        <form action={deleteAccount} className="stack">
          <label>
            <input type="checkbox" name="confirm" required /> Entiendo que se borra todo
          </label>
          {deleteState === "confirm" && <p role="alert">Marcá la casilla para confirmar.</p>}
          <button type="submit">Borrar mi cuenta</button>
        </form>
      </section>
    </div>
  );
}
