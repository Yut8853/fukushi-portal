import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import FeedbackPrompt from "@/components/FeedbackPrompt";
import AfterHoursGuide from "@/components/AfterHoursGuide";
import { getPublicPortalData } from "@/lib/data/repository";
import { officeContactType, selectOffices, transferTarget } from "@/lib/support-routing";
import { seoCategoryContent } from "@/lib/seo-content";

export const revalidate = 86_400;

type PageProps = {
  params: Promise<{ municipalityCode: string; categoryId: string }>;
};

async function getPageData(params: PageProps["params"]) {
  const { municipalityCode, categoryId } = await params;
  const data = await getPublicPortalData();
  const municipality = data.municipalities.find((item) => item.id === municipalityCode);
  const category = data.categories.find((item) => item.id === categoryId);
  if (!municipality || !category) return null;
  const prefecture = data.prefectures.find((item) => item.code === municipality.prefectureCode);
  if (!prefecture) return null;
  const offices = selectOffices(data.offices, municipality.id, category.id);
  const availablePrograms = data.programs.filter((item) =>
    item.scope === "national" || item.municipalityId === municipality.id);
  const directPrograms = availablePrograms.filter((item) => item.categoryId === category.id);
  const programs = directPrograms.length ? directPrograms : availablePrograms.filter((item) =>
    ["public-assistance", "self-reliance"].includes(item.id));
  const sources = new Map(data.sources.map((item) => [item.id, item]));
  const nearbyMunicipalities = data.municipalities
    .filter((item) => item.prefectureCode === municipality.prefectureCode && item.id !== municipality.id)
    .slice(0, 8);
  return { data, municipality, prefecture, category, offices, programs, sources, nearbyMunicipalities };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const page = await getPageData(params);
  if (!page) return {};
  const seo = seoCategoryContent(page.category.id);
  const title = `${page.municipality.name}で${seo.searchTitle}ときの相談先`;
  const firstOffice = page.offices[0]?.plainName || page.offices[0]?.name;
  const description = `${page.prefecture.name}${page.municipality.name}で${seo.searchTitle}ときの公的な相談先${firstOffice ? `「${firstOffice}」` : ""}と、電話での伝え方を案内します。`;
  return {
    title,
    description,
    keywords: [...seo.relatedTerms, page.municipality.name, page.prefecture.name],
    alternates: { canonical: `/support/${page.municipality.id}/${page.category.id}` },
    openGraph: {
      title,
      description,
      url: `/support/${page.municipality.id}/${page.category.id}`,
      type: "article",
    },
    robots: {
      index: page.offices.length > 0,
      follow: true,
      googleBot: { index: page.offices.length > 0, follow: true },
    },
  };
}

export default async function MunicipalitySupportPage({ params }: PageProps) {
  const page = await getPageData(params);
  if (!page) notFound();
  const { data, municipality, prefecture, category, offices, programs, sources, nearbyMunicipalities } = page;
  const seo = seoCategoryContent(category.id);
  const pageUrl = `${process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://fukushi.junkbranding.com"}/support/${municipality.id}/${category.id}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": pageUrl,
        url: pageUrl,
        name: `${municipality.name}で${seo.searchTitle}ときの相談先`,
        description: seo.summary,
        inLanguage: "ja",
        dateModified: municipality.lastVerifiedAt,
        isPartOf: { "@id": `${process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://fukushi.junkbranding.com"}/#website` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "トップ", item: process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://fukushi.junkbranding.com" },
          { "@type": "ListItem", position: 2, name: "相談先一覧", item: `${process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://fukushi.junkbranding.com"}/support` },
          { "@type": "ListItem", position: 3, name: prefecture.name, item: `${process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://fukushi.junkbranding.com"}/support/${prefecture.code}` },
          { "@type": "ListItem", position: 4, name: municipality.name },
        ],
      },
      ...(offices.length ? [{
        "@type": "ItemList",
        name: `${municipality.name}の相談窓口`,
        itemListElement: offices.map((office, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: office.plainName || office.name,
          url: sources.get(office.sourceId)?.url || office.officialUrl || pageUrl,
        })),
      }] : []),
    ],
  };
  return (
    <main id="main" className="page-shell content-page support-guide">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="breadcrumbs" aria-label="パンくず">
        <Link href="/">トップ</Link><Link href="/support">相談先一覧</Link>
        <Link href={`/support/${prefecture.code}`}>{prefecture.name}</Link><span>{municipality.name}</span>
      </nav>
      <p className="eyebrow">{prefecture.name}{municipality.name}の公的な相談先</p>
      <h1>{municipality.name}で<br />{seo.searchTitle}とき</h1>
      <p className="lead">{seo.summary}</p>
      <aside className="first-action">
        <h2>急いでいるとき、最初にすること</h2>
        <p>{seo.firstAction}</p>
        <p>名前や住所、詳しい事情をこのサイトへ入力する必要はありません。</p>
      </aside>
      <AfterHoursGuide categoryId={category.id} />

      {(category.id === "food" || category.id === "housing") && (
        <aside className="expectation-bridge">
          <h2>{category.id === "food" ? "食べ物につながるための相談窓口です" : "泊まる場所につながるための相談窓口です"}</h2>
          <p>
            {category.id === "food"
              ? "窓口へ電話すると、利用できる食料支援、フードバンク、緊急の食料提供などを一緒に探してもらえます。"
              : "窓口へ電話すると、一時的な宿泊や住まいの支援を利用できるか一緒に確認してもらえます。"}
            支援を必ず受けられるという意味ではありませんが、入口になる窓口です。
          </p>
        </aside>
      )}

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
              <dl className="office-details">
                <dt>受付時間</dt>
                <dd>{office.openingHours || "未確認です。役所関係の窓口は平日の日中だけの場合が多いため、公式ページで確認してください。"}</dd>
                {office.closedDays && <><dt>休み</dt><dd>{office.closedDays}</dd></>}
                {office.address && <><dt>場所</dt><dd>{office.address}</dd></>}
              </dl>
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

      {offices.length > 0 && (
        <aside className="connection-fallback">
          <h2>電話がつながらないとき</h2>
          <ol>
            <li>受付時間を確認し、時間内に少し間をあけてかけ直す</li>
            {offices.some((office) => office.availableMethods.includes("来所")) && (
              <li>安全に移動できる場合は、受付時間を確認して窓口へ直接行く</li>
            )}
            {category.id !== "violence" && <li>急ぐ場合は自治体の代表電話から担当につないでもらう</li>}
          </ol>
          <p>つながらなかったことは、あなたの責任ではありません。</p>
        </aside>
      )}

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

      <section className="content-section related-guides">
        <h2>{municipality.name}のほかの困りごと</h2>
        <ul>
          {data.categories.filter((item) => item.id !== category.id).map((item) => (
            <li key={item.id}><Link href={`/support/${municipality.id}/${item.id}`}>{seoCategoryContent(item.id).searchTitle}</Link></li>
          ))}
        </ul>
      </section>

      {nearbyMunicipalities.length > 0 && (
        <section className="content-section related-guides">
          <h2>{prefecture.name}の近隣自治体から探す</h2>
          <ul>
            {nearbyMunicipalities.map((item) => (
              <li key={item.id}><Link href={`/support/${item.id}/${category.id}`}>{item.name}で{seo.searchTitle}とき</Link></li>
            ))}
          </ul>
        </section>
      )}

      <p><a href={municipality.officialUrl} target="_blank" rel="noreferrer">{municipality.name}公式サイトを開く</a></p>
      <p><Link href={`/?need=${category.id}&municipality=${municipality.id}#support-results`}>検索画面でこの案内を見る・共有する</Link></p>
      <FeedbackPrompt context={`${municipality.id}:${category.id}`} />
      <p className="note">
        情報確認日：{municipality.lastVerifiedAt || "未確認"}。制度や受付時間は変わることがあります。
        利用前に公式情報または窓口で最新内容を確認してください。
      </p>
    </main>
  );
}
