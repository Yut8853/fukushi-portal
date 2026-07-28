import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicPortalData } from "@/lib/data/repository";
import { seoCategoryContent } from "@/lib/seo-content";
import { SITE_URL } from "@/lib/site";

type PageProps = { params: Promise<{ categoryId: string }> };

async function getCategoryPage(params: PageProps["params"]) {
  const { categoryId } = await params;
  const data = await getPublicPortalData();
  const category = data.categories.find((item) => item.id === categoryId);
  if (!category) return null;
  return { data, category, seo: seoCategoryContent(category.id) };
}

export function generateStaticParams() {
  return [
    "food",
    "housing",
    "rent",
    "utilities",
    "money",
    "medical",
    "work",
    "debt",
    "violence",
    "children",
    "mental",
    "disability",
    "care",
    "unknown",
  ].map((categoryId) => ({ categoryId }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const page = await getCategoryPage(params);
  if (!page) return {};
  const title = `${page.seo.searchTitle}ときの相談窓口を地域から探す`;
  const description = `${page.seo.summary} 全国1,741市区町村から、お住まいの地域の公的な相談先と電話での伝え方を確認できます。`;
  return {
    title,
    description,
    keywords: page.seo.relatedTerms,
    alternates: { canonical: `/support/category/${page.category.id}` },
    openGraph: {
      title,
      description,
      url: `/support/category/${page.category.id}`,
      type: "website",
    },
  };
}

export default async function CategoryDirectoryPage({ params }: PageProps) {
  const page = await getCategoryPage(params);
  if (!page) notFound();
  const pageUrl = `${SITE_URL}/support/category/${page.category.id}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": pageUrl,
        url: pageUrl,
        name: `${page.seo.searchTitle}ときの地域別相談窓口`,
        description: page.seo.summary,
        inLanguage: "ja",
        isPartOf: { "@id": `${SITE_URL}/#website` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "トップ", item: SITE_URL },
          {
            "@type": "ListItem",
            position: 2,
            name: "相談先一覧",
            item: `${SITE_URL}/support`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: page.seo.searchTitle,
            item: pageUrl,
          },
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
        <Link href="/support">相談先一覧</Link>
        <span>{page.seo.searchTitle}</span>
      </nav>
      <p className="eyebrow">全国1,741市区町村の公的な相談先</p>
      <h1>{page.seo.searchTitle}ときの相談窓口</h1>
      <p className="lead">{page.seo.summary}</p>

      <section className="content-section">
        <h2>相談するとき最初に伝えること</h2>
        <p>{page.seo.firstAction}</p>
        <p>
          制度名が分からなくても相談できます。窓口では、困っていることと、今日・数日以内に
          対応が必要かを伝えてください。
        </p>
      </section>

      <section className="content-section" aria-labelledby="area-directory-title">
        <h2 id="area-directory-title">市区町村から相談先を探す</h2>
        <p>都道府県名を開くと、市区町村ごとの案内ページを選べます。</p>
        <div className="category-prefecture-list">
          {page.data.prefectures.map((prefecture) => {
            const municipalities = page.data.municipalities.filter(
              (municipality) => municipality.prefectureCode === prefecture.code,
            );
            return (
              <details key={prefecture.code}>
                <summary>
                  {prefecture.name}（{municipalities.length}自治体）
                </summary>
                <ul>
                  {municipalities.map((municipality) => (
                    <li key={municipality.id}>
                      <Link href={`/support/${municipality.id}/${page.category.id}`}>
                        {municipality.name}の相談先
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
        </div>
      </section>

      <section className="content-section">
        <h2>関連する検索語</h2>
        <p>{page.seo.relatedTerms.join("、")}</p>
      </section>
    </main>
  );
}
