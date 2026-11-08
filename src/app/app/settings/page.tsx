import { BusinessForm } from "@/components/business-form";
import { deleteAccount, signOut } from "@/server/auth-actions";
import { logoDataUrl } from "@/server/logo-url";
import { requireBusiness } from "@/server/session";

export default async function Settings({ searchParams }: PageProps<"/app/settings">) {
  const { user, business } = await requireBusiness();
  const { delete: deleteState } = await searchParams;
  return (
    <div className="stack-lg form-page">
      <h1>Datos del negocio</h1>
      <section className="panel">
        <BusinessForm
          onboarding={false}
          values={{ ...business, logoDataUrl: logoDataUrl(business.logo) }}
        />
      </section>

      <section className="panel stack" aria-labelledby="session-title">
        <h2 id="session-title">Tu sesión</h2>
        <p className="muted">
          {user.isAnonymous ? "Estás en una cuenta de prueba." : `Entraste como ${user.email}.`}
        </p>
        <form action={signOut}>
          <button type="submit" className="btn-secondary">
            Salir
          </button>
        </form>
      </section>

      <section className="panel stack" aria-labelledby="delete-title">
        <h2 id="delete-title">Borrar mi cuenta</h2>
        <p className="muted">
          Se borran tu cuenta y todos sus datos: negocio, clientes, catálogo y presupuestos. Los
          links que compartiste dejan de funcionar. No se puede deshacer.
        </p>
        <form action={deleteAccount} className="stack">
          <label className="check">
            <input type="checkbox" name="confirm" required />
            Entiendo que se borra todo
          </label>
          {deleteState === "confirm" && (
            <p className="alert" role="alert">
              Marcá la casilla para confirmar.
            </p>
          )}
          <div>
            <button type="submit" className="btn-danger">
              Borrar mi cuenta
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
