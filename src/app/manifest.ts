import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Presu",
    short_name: "Presu",
    description:
      "Armá presupuestos con tu lista de precios, mandalos por WhatsApp y seguí las respuestas.",
    lang: "es-AR",
    start_url: "/app/quotes",
    display: "standalone",
    theme_color: "#1f5135",
    background_color: "#1f5135",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
