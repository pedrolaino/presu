import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Presu",
    short_name: "Presu",
    description: "Presupuestos que se mandan por link y se siguen hasta que se aceptan.",
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
