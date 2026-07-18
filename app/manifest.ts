import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nomadix Apps",
    short_name: "Nomadix",
    description: "Independent app studio creating focused iOS and Android software.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3efe5",
    theme_color: "#2455ff",
    icons: [
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
