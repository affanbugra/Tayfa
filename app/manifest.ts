import type { MetadataRoute } from "next";
import { tr } from "@/lib/i18n/tr";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: tr.appName,
    short_name: "Tayfa",
    description: tr.appDescription,
    lang: "tr",
    start_url: "/",
    display: "standalone",
    background_color: "#4BBACD",
    theme_color: "#4BBACD",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
