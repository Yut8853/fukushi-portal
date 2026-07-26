import type { Metadata } from "next";
import EmergencyBanner from "@/components/EmergencyBanner";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "くらし支援ナビ",
  description: "生活に困ったとき、今いる地域から相談先と次の行動を探せる福祉ポータル",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        <a className="skip-link" href="#main">本文へ移動</a>
        <EmergencyBanner />
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
