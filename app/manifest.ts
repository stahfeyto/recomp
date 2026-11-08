import type { MetadataRoute } from "next";

/** Manifest da PWA: instalar no ecrã principal do telemóvel (precisa de HTTPS). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RECOMP · Recomposição corporal",
    short_name: "RECOMP",
    description: "Tracker pessoal de recomposição corporal: medidas, evolução, metas e treino.",
    lang: "pt-PT",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#05060D",
    theme_color: "#05060D",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Registar medição", short_name: "Medição", url: "/medidas" },
      { name: "Evolução", url: "/evolucao" },
      { name: "Metas", url: "/metas" },
    ],
  };
}
