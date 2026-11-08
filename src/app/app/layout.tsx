import Link from "next/link";
import { signOut } from "@/server/auth-actions";
import { requireBusiness } from "@/server/session";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const { user, business } = await requireBusiness();
  return (
    <>
      <header className="page">
        <nav aria-label="Principal">
          <strong>{business.name}</strong>
          <Link href="/app/quotes">Presupuestos</Link>
          <Link href="/app/clients">Clientes</Link>
          <Link href="/app/catalog">Catálogo</Link>
          <Link href="/app/metrics">Métricas</Link>
          <Link href="/app/settings">Negocio</Link>
          <form action={signOut}>
            <button type="submit">Salir</button>
          </form>
        </nav>
        {user.isAnonymous && (
          <p role="note">
            Estás en una cuenta de prueba con datos de ejemplo. Se borra sola a las 24 horas.
          </p>
        )}
      </header>
      <main className="page">{children}</main>
    </>
  );
}
