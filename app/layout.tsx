import type { Metadata } from "next";
import EmergencyBanner from "@/components/EmergencyBanner";
import JsonLd from "@/components/JsonLd";
import QuickExit from "@/components/QuickExit";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "生活保護・福祉の相談先を地域から探す | くらし支援ナビ",
    template: "%s | くらし支援ナビ",
  },
  description:
    "生活費、住まい、仕事、介護、障害、DVなどで困ったときに、全国の自治体にある生活保護・生活困窮・福祉の相談窓口を地域から探せます。",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "くらし支援ナビ",
    title: "生活保護・福祉の相談先を地域から探す | くらし支援ナビ",
    description:
      "制度名を知らなくても、生活の困りごとから全国の自治体にある公的な相談先を探せます。",
  },
  twitter: { card: "summary_large_image" },
  ...(process.env.GOOGLE_SITE_VERIFICATION?.trim()
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION.trim() } }
    : {}),
  category: "福祉・生活相談",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebSite",
                "@id": `${SITE_URL}/#website`,
                url: SITE_URL,
                name: "くらし支援ナビ",
                alternateName: "全国の生活保護・福祉相談窓口検索",
                description:
                  "生活費、住まい、仕事、介護、障害、DVなどの困りごとから、全国の生活保護・生活困窮・福祉相談窓口を探せる情報案内サイト",
                inLanguage: "ja",
                publisher: { "@id": `${SITE_URL}/#organization` },
              },
              {
                "@type": "Organization",
                "@id": `${SITE_URL}/#organization`,
                name: "JUNKBRANDING",
                url: "https://www.junkbranding.com/",
                email: "hello@junkbranding.com",
                publishingPrinciples: `${SITE_URL}/editorial-policy`,
                correctionsPolicy: `${SITE_URL}/corrections`,
                sameAs: ["https://github.com/Yut8853/fukushi-portal"],
                address: {
                  "@type": "PostalAddress",
                  addressLocality: "美浦村",
                  addressRegion: "茨城県",
                  addressCountry: "JP",
                },
              },
            ],
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
