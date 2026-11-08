import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Presu",
  description: "Presupuestos que se mandan por link y se siguen hasta que se aceptan.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR">
      <body>{children}</body>
    </html>
  );
}
