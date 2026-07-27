import { ImageResponse } from "next/og";

export const alt = "くらし支援ナビ — 生活の困りごとから相談先を探す";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column",
        justifyContent: "center", padding: "80px", color: "#17352d", background: "#f1f7f2",
        fontFamily: "sans-serif",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div style={{
            width: 100, height: 100, display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 28, color: "white", background: "#176b55", fontSize: 62, fontWeight: 800,
          }}>く</div>
          <div style={{ fontSize: 66, fontWeight: 800 }}>くらし支援ナビ</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 48, fontSize: 40, lineHeight: 1.5 }}>
          <span>制度名を知らなくても、</span>
          <span>生活の困りごとから相談先を探せます。</span>
        </div>
      </div>
    ),
    size,
  );
}
