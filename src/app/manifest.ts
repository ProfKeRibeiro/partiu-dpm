import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Partiu DPM",
    short_name: "Partiu DPM",
    description:
      "Eventos, inscrições e certificados da comunidade escolar DPM em um só lugar.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf8f1",
    theme_color: "#003049",
    lang: "pt-BR",
    icons: [
      {
        src: "/icon.png",
        sizes: "256x256",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/marca/logo-oficial-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
