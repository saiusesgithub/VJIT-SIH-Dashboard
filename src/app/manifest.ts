import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VJIT SIH Internal Hackathon Evaluation",
    short_name: "VJIT SIH",
    description: "Mobile evaluation workspace for VJIT SIH judges and mentors.",
    start_url: "/judge",
    scope: "/",
    display: "standalone",
    background_color: "#fafaf9",
    theme_color: "#18181b",
    orientation: "portrait-primary",
    icons: [
      { src: "/icons/vjit-sih.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/vjit-sih-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/vjit-sih-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/vjit-sih-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
