import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import FeedbackPrompt from "@/components/FeedbackPrompt";
import { getPublicPortalData } from "@/lib/data/repository";

type PageProps = {
  params: Promise<{ municipalityCode: string; categoryId: string }>;
};

async function getPageData(params: PageProps["params"]) {
  const { municipalityCode, categoryId } = await params;
  const data = await getPublicPortalData();
  const municipality = data.municipalities.find((item) => item.id === municipalityCode);
  const category = data.categories.find((item) => item.id === categoryId);
  if (!municipality || !category) return null;
  const directOffices = data.offices.filter((item) =>
    item.municipalityId === municipality.id && item.categoryId === category.id);
  const offices = directOffices.length ? directOffices : data.offices.filter((item) =>
    item.municipalityId === municipality.id && item.categoryId === "unknown");
  const availablePrograms = data.programs.filter((item) =>
    item.scope === "national" || item.municipalityId === municipality.id);
  const directPrograms = availablePrograms.filter((item) => item.categoryId === category.id);
  const programs = directPrograms.length ? directPrograms : availablePrograms.filter((item) =>
    ["public-assistance", "self-reliance"].includes(item.id));
  const sources = new Map(data.sources.map((item) => [item.id, item]));
  return { municipality, category, offices, programs, sources };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const page = await getPageData(params);
  if (!page) return {};
  const title = `${page.municipality.name}で${page.category.label}ときの相談先`;
  const description = `${page.municipality.name}で「${page.category.label}」ときに相談できる公的窓口と制度を、公式情報をもとに案内します。`;
  return {
    title,
    description,
    alternates: { canonical: `/support/${page.municipality.id}/${page.category.id}` },
    openGraph: { title, description },
  };
}

export default async function MunicipalitySupportPage({ params }: PageProps) {
  const page = await getPageData(params);
  if (!page) notFound();
  const { municipality, category, offices, programs, sources } = page;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${municipality.name}で${category.label}ときの相談先`,
    description: category.description,
    about: { "@type": "GovernmentService", name: category.label },
  };
  return (
    <main id="main" className="page-shell content-page support-guide">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="eyebrow">{municipality.name}の公的な相談先</p>
      <h1>{municipality.name}で<br />「{category.label}」とき</h1>
      <p className="lead">{category.description}について、最初に相談できる窓口を案内します。</p>

      <section className="content-section call-script">
        <h2>電話や窓口で、こう伝えて大丈夫です</h2>
        <p>「{category.label}ことで困っています。使える制度や相談先を教えてください」</p>
      </section>

      <section className="content-section">
        <h2>相談できる窓口</h2>
        {offices.map((office) => {
          const source = sources.get(office.sourceId);
          return (
            <article className="office-card" key={office.id}>
              <h3>{office.plainName || office.name}</h3>
              {office.categoryId === "unknown" && category.id !== "unknown" && (
                <p className="fallback-notice">専用窓口が未登録のため、自治体の代表窓口から担当部署を案内してもらえます。</p>
              )}
              {office.phone && <p><a className="phone-button" href={`tel:${office.phone.replace(/[^\d+]/g, "")}`}>電話する　<strong>{office.phone}</strong></a></p>}
              {source && <p><a href={source.url} target="_blank" rel="noreferrer">公式情報を確認する</a></p>}
            </article>
          );
        })}
      </section>

      {programs.length > 0 && (
        <section className="content-section">
          <h2>利用できる可能性がある制度</h2>
          {programs.map((program) => {
            const source = sources.get(program.sourceId);
            return (
              <article className="result-card" key={program.id}>
                <h3>{program.plainName || program.name}</h3>
                <p>{program.description}</p>
                <h4>まずすること</h4>
                <p>{program.applicationFlow}</p>
                {source && <p><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></p>}
              </article>
            );
          })}
        </section>
      )}

      <p><a href={municipality.officialUrl} target="_blank" rel="noreferrer">{municipality.name}公式サイトを開く</a></p>
      <p><Link href={`/?need=${category.id}&municipality=${municipality.id}#support-results`}>検索画面でこの案内を見る・共有する</Link></p>
      <FeedbackPrompt context={`${municipality.id}:${category.id}`} />
      <p className="note">制度や受付時間は変わることがあります。利用前に公式情報または窓口で最新内容を確認してください。</p>
    </main>
  );
}
