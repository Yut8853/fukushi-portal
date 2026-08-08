import type { Metadata } from "next";
import Link from "next/link";
import { getPublicPortalData } from "@/lib/data/repository";
import { GUIDE_CONTENT } from "@/lib/guide-content";
import { seoCategoryContent } from "@/lib/seo-content";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "生活・福祉制度ガイド一覧",
  description:
    "生活保護、住居確保給付金、高額療養費、傷病手当金などの制度を一次情報に基づいて案内します。",
  alternates: { canonical: "/guide" },
};

export default async function GuideDirectoryPage() {
  const data = await getPublicPortalData();
  const programNames = new Map(data.programs.map((program) => [program.id, program.name]));
  const categories = [...new Set(GUIDE_CONTENT.map((guide) => guide.categoryId))];
  const pageUrl = `${SITE_URL}/guide`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": pageUrl,
        url: pageUrl,
        name: "生活・福祉制度ガイド一覧",
        description: "生活に困ったときに利用できる可能性がある制度の解説一覧です。",
        inLanguage: "ja",
        isPartOf: { "@id": `${SITE_URL}/#website` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "トップ", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "制度ガイド", item: pageUrl },
        ],
      },
    ],
  };

  return (
    <main id="main" className="page-shell content-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="breadcrumbs" aria-label="パンくず">
        <Link href="/">トップ</Link>
        <span>制度ガイド</span>
      </nav>
      <p className="eyebrow">制度名から探す</p>
      <h1>生活・福祉制度ガイド</h1>
      <p className="lead">
        制度の対象になる可能性、相談・申請の流れ、電話での伝え方、一次情報を確認できます。受給できるかどうかは地域の担当窓口で確認してください。
      </p>
      {categories.map((categoryId) => (
        <section className="content-section related-guides" key={categoryId}>
          <h2>{seoCategoryContent(categoryId).searchTitle}</h2>
          <ul>
            {GUIDE_CONTENT.filter((guide) => guide.categoryId === categoryId).map((guide) => (
              <li key={guide.slug}>
                <Link href={`/guide/${guide.slug}`}>
                  <strong>{programNames.get(guide.programId) ?? guide.searchTitle}</strong>
                  <span>{guide.shortAnswer}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p>
            <Link href={`/support/category/${categoryId}`}>この困りごとの地域窓口を探す</Link>
          </p>
        </section>
      ))}
    </main>
  );
}
