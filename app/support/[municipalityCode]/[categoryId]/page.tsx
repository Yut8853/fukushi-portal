import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import FeedbackPrompt from "@/components/FeedbackPrompt";
import { getPublicPortalData } from "@/lib/data/repository";
import { officeContactType, selectOffices, transferTarget } from "@/lib/support-routing";

type PageProps = {
  params: Promise<{ municipalityCode: string; categoryId: string }>;
};

async function getPageData(params: PageProps["params"]) {
  const { municipalityCode, categoryId } = await params;
  const data = await getPublicPortalData();
  const municipality = data.municipalities.find((item) => item.id === municipalityCode);
  const category = data.categories.find((item) => item.id === categoryId);
  if (!municipality || !category) return null;
  const offices = selectOffices(data.offices, municipality.id, category.id);
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

      {category.id === "utilities" && (
        <aside className="utility-guidance">
          <h2>電気・ガスと水道では、連絡先が違います</h2>
          <p><strong>電気・ガス：</strong>請求書や検針票に書かれた会社へ電話し、「支払いを待ってもらえないか相談したいです」と伝えてください。</p>
          <p><strong>水道：</strong>自治体や水道局の料金担当へ相談します。</p>
        </aside>
      )}

      <section className="content-section">
        <h2>相談できる窓口</h2>
        {category.id === "violence" && offices.length === 0 && (
          <p className="danger-guidance">
            安全のため自治体の代表電話は表示していません。ページ上部のDV相談＋の電話・チャット・メールを利用してください。
          </p>
        )}
        {offices.map((office) => {
          const source = sources.get(office.sourceId);
          const contactType = officeContactType(office);
          return (
            <article className="office-card" key={office.id}>
              <p className={`contact-rank ${contactType}`}>
                {contactType === "representative"
                  ? "代表電話・担当への取り次ぎが必要"
                  : contactType === "self-reliance"
                    ? "総合相談の直通・このまま話せます"
                    : "専用窓口の直通・このまま話せます"}
              </p>
              <h3>{office.plainName || office.name}</h3>
              {office.phone && <p><a className="phone-button" href={`tel:${office.phone.replace(/[^\d+]/g, "")}`}>電話する　<strong>{office.phone}</strong></a></p>}
              {contactType === "representative" ? (
                <div className="transfer-script">
                  <h4>まず受付の人に</h4>
                  <p>「{transferTarget(category.id)}につないでください」</p>
                  <small>事情は、まだ話さなくて大丈夫です。</small>
                  <h4>「どのような用件ですか」と聞かれたら</h4>
                  <p>「生活のことで相談したいです」</p>
                  <h4>担当につながったら</h4>
                  <p>「{category.label}ことで困っています。使える制度や相談先を教えてください」</p>
                </div>
              ) : (
                <div className="direct-script">
                  <h4>電話で、こう伝えて大丈夫です</h4>
                  <p>「{category.label}ことで困っています。使える制度や相談先を教えてください」</p>
                </div>
              )}
              {source && <p><a href={source.url} target="_blank" rel="noreferrer">公式情報を確認する</a></p>}
            </article>
          );
        })}
      </section>

      {offices.some((office) => officeContactType(office) === "representative") && (
        <aside className="transfer-tips">
          <h2>電話を何度も回されないために</h2>
          <ol>
            <li>つないでもらう前に「切れたときのために、直通番号を教えてください」</li>
            <li>違う担当なら「どこにかければよいですか。番号も教えてください」</li>
            <li>3回回されたら、電話を切って総合相談の直通へかけ直して大丈夫です。</li>
          </ol>
        </aside>
      )}

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
