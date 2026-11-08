import { Storefront } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { SidebarNav, TabBar } from "@/components/app-nav";
import { signOut } from "@/server/auth-actions";
import { requireBusiness } from "@/server/session";

function Brand() {
  return (
    <Link href="/app/quotes" className="brand">
      <span className="brand-mark" aria-hidden>
        P
      </span>
      Presu
    </Link>
  );
}

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const { user, business } = await requireBusiness();
  return (
    <div className="app">
      <aside className="sidebar">
        <Brand />
        <SidebarNav />
        <div className="sidebar-foot">
          <strong>{business.name}</strong>
          <span className="muted">{user.isAnonymous ? "Cuenta de prueba" : user.email}</span>
          <form action={signOut}>
            <button type="submit" className="btn-secondary">
              Salir
            </button>
          </form>
        </div>
      </aside>

      <header className="topbar">
        <Brand />
        <Link href="/app/settings" className="topbar-business">
          <Storefront size={20} aria-hidden className="ic" />
          <span>{business.name}</span>
        </Link>
      </header>

      <main className="app-main">
        {user.isAnonymous && (
          <p className="notice notice-clay guest-note" role="note">
            Estás en una cuenta de prueba con datos de ejemplo. Se borra sola a las 24 horas.
          </p>
        )}
        {children}
      </main>
      <TabBar />
    </div>
  );
}
