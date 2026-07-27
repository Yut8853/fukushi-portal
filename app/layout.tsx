import type { Metadata } from "next";
import EmergencyBanner from "@/components/EmergencyBanner";
import QuickExit from "@/components/QuickExit";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "くらし支援ナビ",
    template: "%s | くらし支援ナビ",
  },
  description: "生活に困ったとき、今いる地域から相談先と次の行動を探せる福祉ポータル",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "くらし支援ナビ",
    title: "くらし支援ナビ",
    description: "制度名を知らなくても、生活の困りごとから地域の公的な相談先を探せます。",
  },
  twitter: { card: "summary_large_image" },
  verification: {
    google:
      process.env.GOOGLE_SITE_VERIFICATION?.trim() || "LEkZOcAeq4rXooCOsOS3EisHeiHwDTe9Zl7Rka0F0gQ",
  },
  category: "福祉・生活相談",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "@id": `${SITE_URL}/#website`,
              url: SITE_URL,
              name: "くらし支援ナビ",
              description: "生活の困りごとから全国の公的な相談先を探せる個人運営の情報案内サイト",
              inLanguage: "ja",
              publisher: { "@type": "Organization", name: "JUNKBRANDING" },
            }),
          }}
        />
        <a className="skip-link" href="#main">
          本文へ移動
        </a>
        <QuickExit />
        <EmergencyBanner />
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
