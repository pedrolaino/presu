import type { Metadata, Viewport } from "next";
import { Figtree, Fraunces } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["opsz"] });
const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree" });

export const metadata: Metadata = {
  title: { default: "Presu", template: "%s · Presu" },
  description:
    "Armá presupuestos con tu lista de precios, mandalos por WhatsApp y seguí las respuestas.",
};

export const viewport: Viewport = { themeColor: "#1f5135" };

// Every page renders per request so the CSP nonce reaches Next's scripts.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={`${fraunces.variable} ${figtree.variable}`}>
      <body>{children}</body>
    </html>
  );
}
