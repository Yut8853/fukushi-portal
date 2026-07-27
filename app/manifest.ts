import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "くらし支援ナビ",
    short_name: "くらし支援ナビ",
    description: "生活の困りごとから全国の公的な相談先を探せます。",
    start_url: "/",
    display: "standalone",
    background_color: "#f1f7f2",
    theme_color: "#176b55",
    lang: "ja",
  };
}
