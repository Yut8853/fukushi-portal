import type { Metadata } from "next";
import Link from "next/link";
import { getPublicPortalData } from "@/lib/data/repository";
import { seoCategoryContent } from "@/lib/seo-content";

export const metadata: Metadata = {
  title: "全国の生活・福祉相談窓口を地域から探す",
  description:
    "全国47都道府県、1,741自治体の生活困窮、家賃、生活保護、DV、子育て、介護などの相談先を地域から探せます。",
  alternates: { canonical: "/support" },
};

export default async function SupportDirectoryPage() {
  const data = await getPublicPortalData();
  return (
    <main id="main" className="page-shell content-page">
      <nav className="breadcrumbs" aria-label="パンくず">
        <Link href="/">トップ</Link>
        <span>相談先一覧</span>
      </nav>
      <p className="eyebrow">全国47都道府県・1,741自治体</p>
      <h1>地域から生活・福祉の相談先を探す</h1>
      <p className="lead">都道府県を選ぶと、市区町村ごとの公的な相談窓口を確認できます。</p>
      <section className="content-section">
        <h2>都道府県から探す</h2>
        <ul className="directory-grid">
          {data.prefectures.map((prefecture) => {
            const count = data.municipalities.filter(
              (item) => item.prefectureCode === prefecture.code,
            ).length;
            return (
              <li key={prefecture.code}>
                <Link href={`/support/${prefecture.code}`}>
                  {prefecture.name}
                  <small>{count}自治体</small>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
      <section className="content-section">
        <h2>困りごとの例</h2>
        <ul className="keyword-list">
          {data.categories.map((category) => (
            <li key={category.id}>
              <Link href={`/support/category/${category.id}`}>
                {seoCategoryContent(category.id).searchTitle}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
