import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import MunicipalityDirectoryPicker from "@/components/MunicipalityDirectoryPicker";
import { getPublicPortalData } from "@/lib/data/repository";
import { seoCategoryContent } from "@/lib/seo-content";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ prefectureCode: string }> };

async function getPrefecturePage(params: PageProps["params"]) {
  const { prefectureCode } = await params;
  const data = await getPublicPortalData();
  const prefecture = data.prefectures.find((item) => item.code === prefectureCode);
  if (!prefecture) return null;
  return {
    data,
    prefecture,
    municipalities: data.municipalities.filter((item) => item.prefectureCode === prefecture.code),
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const page = await getPrefecturePage(params);
  if (!page) return {};
  const title = `${page.prefecture.name}の生活・福祉相談窓口一覧`;
  const description = `${page.prefecture.name}の${page.municipalities.length}自治体について、生活費、家賃、食料、仕事、DV、子育て、介護などの公的な相談先を探せます。`;
  return {
    title,
    description,
    alternates: { canonical: `/support/${page.prefecture.code}` },
    openGraph: {
      title,
      description,
      url: `/support/${page.prefecture.code}`,
      type: "website",
    },
  };
}

export default async function PrefectureSupportPage({ params }: PageProps) {
  const page = await getPrefecturePage(params);
  if (!page) notFound();
  const pageUrl = `${SITE_URL}/support/${page.prefecture.code}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": pageUrl,
        url: pageUrl,
        name: `${page.prefecture.name}の生活・福祉相談窓口`,
        description: `${page.prefecture.name}の市区町村と困りごとから公的な相談先を探せます。`,
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
            name: page.prefecture.name,
            item: pageUrl,
          },
        ],
      },
    ],
  };
  return (
    <main id="main" className="page-shell content-page">
      <JsonLd data={jsonLd} />
      <nav className="breadcrumbs" aria-label="パンくず">
        <Link href="/">トップ</Link>
        <Link href="/support">相談先一覧</Link>
        <span>{page.prefecture.name}</span>
      </nav>
      <p className="eyebrow">{page.prefecture.name}</p>
      <h1>{page.prefecture.name}の生活・福祉相談窓口</h1>
      <p className="lead">
        {page.municipalities.length}自治体から市区町村を選び、困りごと別の相談先を確認できます。
      </p>

      <section className="content-section" aria-labelledby="prefecture-needs-title">
        <h2 id="prefecture-needs-title">困りごとから探す</h2>
        <p>
          困りごとを選ぶと、{page.prefecture.name}で地域固有の専門窓口を確認できている
          市区町村を表示します。
        </p>
        <ul className="directory-grid prefecture-category-grid">
          {page.data.categories.map((category) => (
            <li key={category.id}>
              <Link href={`/support/category/${category.id}/${page.prefecture.code}`}>
                {seoCategoryContent(category.id).searchTitle}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <MunicipalityDirectoryPicker
        municipalities={page.municipalities.map(({ id, name, nameKana }) => ({
          id,
          name,
          nameKana,
        }))}
        categories={page.data.categories.map((category) => ({
          id: category.id,
          searchTitle: seoCategoryContent(category.id).searchTitle,
        }))}
      />
    </main>
  );
}
