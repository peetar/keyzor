import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KEYZOR — AI-Native Architect & Feature Flowchart Tracker",
    short_name: "KEYZOR",
    description:
      "AI-friendly feature lifecycle, Flowchart, and Gantt status dashboard for software architects and agentic developers.",
    start_url: "/",
    display: "standalone",
    background_color: "#090D16",
    theme_color: "#090D16",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
