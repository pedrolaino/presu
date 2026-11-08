"use client";

import { ChartBar, FileText, Package, Storefront, Users } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/app/quotes", label: "Presupuestos", Icon: FileText },
  { href: "/app/clients", label: "Clientes", Icon: Users },
  { href: "/app/catalog", label: "Catálogo", Icon: Package },
  { href: "/app/metrics", label: "Métricas", Icon: ChartBar },
  { href: "/app/settings", label: "Negocio", Icon: Storefront },
];

function useCurrent() {
  const path = usePathname();
  return (href: string) => (path.startsWith(href) ? ("page" as const) : undefined);
}

export function SidebarNav() {
  const current = useCurrent();
  return (
    <nav aria-label="Principal">
      {links.map(({ href, label, Icon }) => (
        <Link key={href} href={href} className="nav-link" aria-current={current(href)}>
          <Icon
            size={22}
            weight={current(href) ? "duotone" : "regular"}
            aria-hidden
            className="ic"
          />
          {label}
        </Link>
      ))}
    </nav>
  );
}

/** Phone tab bar; the business settings live behind the name in the top bar. */
export function TabBar() {
  const current = useCurrent();
  return (
    <nav aria-label="Principal" className="tabbar">
      {links.slice(0, 4).map(({ href, label, Icon }) => (
        <Link key={href} href={href} aria-current={current(href)}>
          <Icon
            size={24}
            weight={current(href) ? "duotone" : "regular"}
            aria-hidden
            className="ic"
          />
          {label}
        </Link>
      ))}
    </nav>
  );
}
