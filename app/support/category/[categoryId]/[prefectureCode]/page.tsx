import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicPortalData } from "@/lib/data/repository";
import { buildOfficeIndex, indexableMunicipalitiesFor } from "@/lib/seo-analysis";
import { isSensitiveCategory, sensitiveSupportMetadata } from "@/lib/privacy";
import { seoCategoryContent } from "@/lib/seo-content";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ categoryId: string; prefectureCode: string }>;
};

async function getPage(params: PageProps["params"]) {
  const { categoryId, prefectureCode } = await params;
  const data = await getPublicPortalData();
  const category = data.categories.find((item) => item.id === categoryId);
  const prefecture = data.prefectures.find((item) => item.code === prefectureCode);
  if (!category || !prefecture) return null;
  const index = buildOfficeIndex(data.offices);
  const municipalities = data.municipalities.filter(
    (item) => item.prefectureCode === prefecture.code,
  );
  const indexableMunicipalities = indexableMunicipalitiesFor(
    data,
    index,
    prefecture.code,
    category.id,
  );
  return {
    category,
    prefecture,
    seo: seoCategoryContent(category.id),
    municipalities,
    indexableMunicipalities,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const page = await getPage(params);
  if (!page) return {};
  const sensitive = isSensitiveCategory(page.category.id);
  const title = sensitive
    ? sensitiveSupportMetadata.title
    : `${page.prefecture.name}で${page.seo.searchTitle}ときの相談先`;
  return {
    title,
    description: sensitive
      ? sensitiveSupportMetadata.description
      : `${page.prefecture.name}の市区町村から、${page.seo.searchTitle}ときの公的な相談先を選べます。`,
    alternates: {
      canonical: `/support/category/${page.category.id}/${page.prefecture.code}`,
    },
    robots: sensitive
      ? { index: false, follow: true, noarchive: true, nosnippet: true }
      : page.indexableMunicipalities.length
        ? { index: true, follow: true }
        : { index: false, follow: true },
    twitter: sensitive
      ? {
          card: "summary",
          title: sensitiveSupportMetadata.title,
          description: sensitiveSupportMetadata.description,
        }
      : undefined,
  };
}

export default async function CategoryPrefecturePage({ params }: PageProps) {
  const page = await getPage(params);
  if (!page) notFound();
  const pageUrl = `${SITE_URL}/support/category/${page.category.id}/${page.prefecture.code}`;
  const categoryUrl = `${SITE_URL}/support/category/${page.category.id}`;
  return (
    <main id="main" className="page-shell content-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "トップ", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: "相談先一覧", item: `${SITE_URL}/support` },
              {
                "@type": "ListItem",
                position: 3,
                name: page.seo.searchTitle,
                item: categoryUrl,
              },
              {
                "@type": "ListItem",
                position: 4,
                name: page.prefecture.name,
                item: pageUrl,
              },
            ],
          }),
        }}
      />
      <nav className="breadcrumbs" aria-label="パンくず">
        <Link href="/">トップ</Link>
        <Link href="/support">相談先一覧</Link>
        <Link href={`/support/category/${page.category.id}`}>{page.seo.searchTitle}</Link>
        <span>{page.prefecture.name}</span>
      </nav>
      <p className="eyebrow">{page.prefecture.name}</p>
      <h1>
        {page.prefecture.name}で{page.seo.searchTitle}ときの相談先
      </h1>
      <p className="lead">お住まいの市区町村を選んでください。</p>
      <section className="content-section">
        <h2>地域固有の専門窓口が確認できている市区町村</h2>
        {page.indexableMunicipalities.length ? (
          <ul className="directory-grid">
            {page.indexableMunicipalities.map((municipality) => (
              <li key={municipality.id}>
                <Link href={`/support/${municipality.id}/${page.category.id}`}>
                  {municipality.name}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p>
            この困りごとについて、地域固有の専門窓口を安全に確認できている市区町村は
            まだありません。全国・都道府県共通の相談先はトップの検索機能から確認できます。
          </p>
        )}
      </section>
      {page.indexableMunicipalities.length < page.municipalities.length && (
        <section className="content-section">
          <h2>そのほかの市区町村</h2>
          <p>
            地域固有の専門窓口が未整備の市区町村でも、全国共通・都道府県共通の相談先や
            自治体の総合案内を検索できます。
          </p>
          <Link
            className="official-link"
            href={
              page.category.id === "violence" || page.category.id === "mental"
                ? "/#support-finder"
                : `/?category=${page.category.id}#support-finder`
            }
          >
            トップの検索機能で探す
          </Link>
        </section>
      )}
    </main>
  );
}
