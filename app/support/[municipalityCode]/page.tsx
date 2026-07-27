import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicPortalData } from "@/lib/data/repository";
import { seoCategoryContent } from "@/lib/seo-content";

type PageProps = { params: Promise<{ municipalityCode: string }> };

async function getPrefecturePage(params: PageProps["params"]) {
  const { municipalityCode: prefectureCode } = await params;
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
  return {
    title: `${page.prefecture.name}の生活・福祉相談窓口一覧`,
    description: `${page.prefecture.name}の${page.municipalities.length}自治体について、生活費、家賃、食料、仕事、DV、子育て、介護などの公的な相談先を探せます。`,
    alternates: { canonical: `/support/${page.prefecture.code}` },
  };
}

export default async function PrefectureSupportPage({ params }: PageProps) {
  const page = await getPrefecturePage(params);
  if (!page) notFound();
  return (
    <main id="main" className="page-shell content-page">
      <nav className="breadcrumbs" aria-label="パンくず">
        <Link href="/">トップ</Link>
        <Link href="/support">相談先一覧</Link>
        <span>{page.prefecture.name}</span>
      </nav>
      <p className="eyebrow">{page.prefecture.name}</p>
      <h1>{page.prefecture.name}の生活・福祉相談窓口</h1>
      <p className="lead">
        {page.municipalities.length}自治体の相談先を、困りごと別に確認できます。
      </p>
      <div className="municipality-directory">
        {page.municipalities.map((municipality) => (
          <section className="municipality-link-group" key={municipality.id}>
            <h2>{municipality.name}</h2>
            <ul>
              {page.data.categories.map((category) => (
                <li key={category.id}>
                  <Link href={`/support/${municipality.id}/${category.id}`}>
                    {seoCategoryContent(category.id).searchTitle}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
