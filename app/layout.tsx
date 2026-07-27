import type { Metadata } from "next";
import EmergencyBanner from "@/components/EmergencyBanner";
import QuickExit from "@/components/QuickExit";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://fukushi.junkbranding.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "くらし支援ナビ",
    template: "%s | くらし支援ナビ",
  },
  description: "生活に困ったとき、今いる地域から相談先と次の行動を探せる福祉ポータル",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "くらし支援ナビ",
    title: "くらし支援ナビ",
    description: "制度名を知らなくても、生活の困りごとから地域の公的な相談先を探せます。",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        <a className="skip-link" href="#main">本文へ移動</a>
        <QuickExit />
        <EmergencyBanner />
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
