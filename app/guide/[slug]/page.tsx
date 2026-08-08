import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import { getPublicPortalData } from "@/lib/data/repository";
import { GUIDE_CONTENT, guideContent } from "@/lib/guide-content";
import { seoCategoryContent } from "@/lib/seo-content";
import { SITE_URL } from "@/lib/site";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return GUIDE_CONTENT.map(({ slug }) => ({ slug }));
}

async function getGuidePage(params: PageProps["params"]) {
  const { slug } = await params;
  const guide = guideContent(slug);
  if (!guide) return null;
  const data = await getPublicPortalData();
  const program = data.programs.find((item) => item.id === guide.programId);
  if (!program) return null;
  const source = data.sources.find((item) => item.id === program.sourceId);
  if (!source) return null;
  return { guide, program, source };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const page = await getGuidePage(params);
  if (!page) return {};
  const description = `${page.guide.shortAnswer} 対象になる可能性、相談・申請の流れ、必要書類、地域の相談先を確認できます。`;
  return {
    title: page.guide.searchTitle,
    description,
    alternates: { canonical: `/guide/${page.guide.slug}` },
    openGraph: {
      title: page.guide.searchTitle,
      description,
      url: `/guide/${page.guide.slug}`,
      type: "article",
    },
  };
}

export default async function GuidePage({ params }: PageProps) {
  const page = await getGuidePage(params);
  if (!page) notFound();
  const { guide, program, source } = page;
  const pageUrl = `${SITE_URL}/guide/${guide.slug}`;
  const categoryUrl = `${SITE_URL}/support/category/${guide.categoryId}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": pageUrl,
        url: pageUrl,
        name: guide.searchTitle,
        description: guide.shortAnswer,
        inLanguage: "ja",
        isPartOf: { "@id": `${SITE_URL}/#website` },
        dateModified: source.lastVerifiedAt,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "トップ", item: SITE_URL },
          {
            "@type": "ListItem",
            position: 2,
            name: seoCategoryContent(guide.categoryId).searchTitle,
            item: categoryUrl,
          },
          { "@type": "ListItem", position: 3, name: program.name, item: pageUrl },
        ],
      },
    ],
  };

  return (
    <main id="main" className="page-shell content-page">
      <JsonLd data={jsonLd} />
      <nav className="breadcrumbs" aria-label="パンくず">
        <Link href="/">トップ</Link>
        <Link href={`/support/category/${guide.categoryId}`}>
          {seoCategoryContent(guide.categoryId).searchTitle}
        </Link>
        <span>{program.name}</span>
      </nav>
      <p className="eyebrow">制度を知って、地域の窓口へつながる</p>
      <h1>{guide.searchTitle}</h1>
      <p className="lead">{guide.shortAnswer}</p>

      <section className="content-section category-answer" aria-labelledby="guide-first-action">
        <h2 id="guide-first-action">まず相談するところ</h2>
        <p>{program.applicationFlow}</p>
        <p className="call-script">
          <strong>電話では：</strong>「{guide.callScript}」
        </p>
      </section>

      <section className="content-section">
        <h2>対象になる可能性がある人</h2>
        <ul>
          {guide.possibleFor.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p>{program.targetPeople}</p>
      </section>

      <section className="content-section">
        <h2>相談・申請の流れ</h2>
        <ol>
          {guide.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section className="content-section">
        <h2>用意するもの</h2>
        <p>{program.requiredDocuments || "相談内容に応じて窓口から案内されます。"}</p>
        {program.documentsOptionalNote && <p>{program.documentsOptionalNote}</p>}
      </section>

      <section className="content-section">
        <h2>断られた・手続きできないと感じた場合</h2>
        <ul>
          {guide.ifStuck.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="content-section source-panel">
        <h2>根拠と確認日</h2>
        <p>
          <a href={source.url} target="_blank" rel="noreferrer">
            {source.publisher}「{source.title}」
          </a>
        </p>
        <p>最終確認：{source.lastVerifiedAt}</p>
        <p>
          制度の要件や運用は変更される場合があります。申請時は公式情報と窓口の案内を確認してください。
        </p>
      </section>

      <section className="content-section guide-next-step">
        <h2>地域の相談窓口を探す</h2>
        <p>都道府県、市区町村の順に選ぶと、公的な相談先と電話番号を確認できます。</p>
        <Link className="contact-button" href={`/support/category/${guide.categoryId}`}>
          地域から相談先を探す
        </Link>
      </section>
    </main>
  );
}
