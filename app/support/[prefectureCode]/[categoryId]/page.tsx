import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import FeedbackPrompt from "@/components/FeedbackPrompt";
import AfterHoursGuide from "@/components/AfterHoursGuide";
import MentalCrisisSupport from "@/components/MentalCrisisSupport";
import UnconfirmedHours from "@/components/UnconfirmedHours";
import { getPublicPortalData } from "@/lib/data/repository";
import { officeContactType, selectOffices, transferTarget } from "@/lib/support-routing";
import { shouldEstimateMunicipalHours } from "@/lib/office-hours";
import { officeDisplayName, officeOrganizationName } from "@/lib/office-label";
import { isSensitiveCategory, sensitiveSupportMetadata } from "@/lib/privacy";
import { isIndexableSupportPage } from "@/lib/seo-indexing";
import { seoCategoryContent } from "@/lib/seo-content";
import { SITE_URL } from "@/lib/site";
import { telephoneAriaLabel, telephoneHref } from "@/lib/telephone";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ prefectureCode: string; categoryId: string }>;
};

async function getPageData(params: PageProps["params"]) {
  const { prefectureCode: municipalityId, categoryId } = await params;
  const data = await getPublicPortalData();
  const municipality = data.municipalities.find((item) => item.id === municipalityId);
  const category = data.categories.find((item) => item.id === categoryId);
  if (!municipality || !category) return null;
  const prefecture = data.prefectures.find((item) => item.code === municipality.prefectureCode);
  if (!prefecture) return null;
  const offices = selectOffices(
    data.offices,
    municipality.id,
    category.id,
    municipality.representativePhone,
    municipality.prefectureCode,
  );
  const availablePrograms = data.programs.filter(
    (item) => item.scope === "national" || item.municipalityId === municipality.id,
  );
  const directPrograms = availablePrograms.filter((item) => item.categoryId === category.id);
  const programs = directPrograms.length
    ? directPrograms
    : availablePrograms.filter((item) => ["public-assistance", "self-reliance"].includes(item.id));
  const sources = new Map(data.sources.map((item) => [item.id, item]));
  const nearbyMunicipalities = data.municipalities
    .filter(
      (item) => item.prefectureCode === municipality.prefectureCode && item.id !== municipality.id,
    )
    .slice(0, 8);
  return {
    data,
    municipality,
    prefecture,
    category,
    offices,
    programs,
    sources,
    nearbyMunicipalities,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const page = await getPageData(params);
  if (!page) return {};
  const seo = seoCategoryContent(page.category.id);
  const sensitive = isSensitiveCategory(page.category.id);
  const title = sensitive
    ? sensitiveSupportMetadata.title
    : `${page.prefecture.name}${page.municipality.name}で${seo.searchTitle}ときの相談先`;
  const firstOffice = page.offices[0] ? officeDisplayName(page.offices[0]) : undefined;
  const description = sensitive
    ? sensitiveSupportMetadata.description
    : `${page.prefecture.name}${page.municipality.name}で${seo.searchTitle}ときの公的な相談先${firstOffice ? `「${firstOffice}」` : ""}と、電話での伝え方を案内します。`;
  const indexable = isIndexableSupportPage(page.offices, page.municipality.id, page.category.id);
  return {
    title,
    description,
    alternates: { canonical: `/support/${page.municipality.id}/${page.category.id}` },
    openGraph: {
      title,
      description,
      url: `/support/${page.municipality.id}/${page.category.id}`,
      type: "article",
    },
    robots: {
      index: !sensitive && indexable,
      follow: true,
      noarchive: sensitive,
      nosnippet: sensitive,
      googleBot: { index: !sensitive && indexable, follow: true },
    },
    twitter: sensitive
      ? {
          card: "summary",
          title: sensitiveSupportMetadata.title,
          description: sensitiveSupportMetadata.description,
        }
      : undefined,
  };
}

export default async function MunicipalitySupportPage({ params }: PageProps) {
  const page = await getPageData(params);
  if (!page) notFound();
  const {
    data,
    municipality,
    prefecture,
    category,
    offices,
    programs,
    sources,
    nearbyMunicipalities,
  } = page;
  const seo = seoCategoryContent(category.id);
  const pageUrl = `${SITE_URL}/support/${municipality.id}/${category.id}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": pageUrl,
        url: pageUrl,
        name: `${prefecture.name}${municipality.name}で${seo.searchTitle}ときの相談先`,
        description: seo.summary,
        inLanguage: "ja",
        dateModified:
          offices
            .map((office) => office.lastVerifiedAt)
            .filter(Boolean)
            .sort()
            .at(-1) || municipality.lastVerifiedAt,
        isPartOf: { "@id": `${SITE_URL}/#website` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "トップ", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "相談先一覧", item: `${SITE_URL}/support` },
          {
            "@type": "ListItem",
            position: 3,
            name: prefecture.name,
            item: `${SITE_URL}/support/${prefecture.code}`,
          },
          {
            "@type": "ListItem",
            position: 4,
            name: municipality.name,
          },
          {
            "@type": "ListItem",
            position: 5,
            name: seo.searchTitle,
            item: pageUrl,
          },
        ],
      },
      ...(offices.length
        ? [
            {
              "@type": "ItemList",
              name: `${municipality.name}の相談窓口`,
              itemListElement: offices.map((office, index) => {
                const sourceUrl =
                  sources.get(office.sourceId)?.url || office.officialUrl || pageUrl;
                return {
                  "@type": "ListItem",
                  position: index + 1,
                  item: {
                    "@type": "GovernmentOffice",
                    name: officeDisplayName(office),
                    url: sourceUrl,
                    ...(office.phone ? { telephone: office.phone } : {}),
                    ...(office.address
                      ? {
                          address: {
                            "@type": "PostalAddress",
                            streetAddress: office.address,
                            addressRegion: prefecture.name,
                            addressCountry: "JP",
                          },
                        }
                      : {}),
                    ...(office.serviceArea ? { areaServed: office.serviceArea } : {}),
                    ...(office.languages ? { availableLanguage: office.languages } : {}),
                  },
                };
              }),
            },
          ]
        : []),
    ],
  };
  return (
    <main id="main" className="page-shell content-page support-guide">
      <JsonLd data={jsonLd} />
      <nav className="breadcrumbs" aria-label="パンくず">
        <Link href="/">トップ</Link>
        <Link href="/support">相談先一覧</Link>
        <Link href={`/support/${prefecture.code}`}>{prefecture.name}</Link>
        <span>{municipality.name}</span>
        <span>{seo.searchTitle}</span>
      </nav>
      <p className="eyebrow">
        {prefecture.name}
        {municipality.name}の公的な相談先
      </p>
      <h1>
        {municipality.name}で<br />
        {seo.searchTitle}とき
      </h1>
      <p className="lead">{seo.summary}</p>
      {category.id === "mental" && <MentalCrisisSupport />}
      <aside className="first-action" aria-label="急いでいるときの最初の行動">
        <h2>急いでいるとき、最初にすること</h2>
        <p>{seo.firstAction}</p>
        <p>名前や住所、詳しい事情をこのサイトへ入力する必要はありません。</p>
      </aside>
      <AfterHoursGuide categoryId={category.id} />

      {(category.id === "food" || category.id === "housing") && (
        <aside className="expectation-bridge">
          <h2>
            {category.id === "food"
              ? "食べ物につながるための相談窓口です"
              : "泊まる場所につながるための相談窓口です"}
          </h2>
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
          <p>
            <strong>電気・ガス：</strong>
            請求書や検針票に書かれた会社へ電話し、「支払いを待ってもらえないか相談したいです」と伝えてください。
          </p>
          <p>
            <strong>水道：</strong>自治体や水道局の料金担当へ相談します。
          </p>
        </aside>
      )}

      <section className="content-section">
        <h2>相談できる窓口</h2>
        {category.id === "violence" && offices.length === 0 && (
          <p className="danger-guidance">
            安全のため自治体の代表電話は表示していません。ページ上部のDV相談＋の電話・チャット・メールを利用してください。
          </p>
        )}
        {offices.filter((office) => office.categoryId === category.id).length > 1 &&
          offices
            .filter((office) => office.categoryId === category.id)
            .some((office) => !office.serviceArea) && (
            <p className="preparing-message">
              複数の窓口があります。お住まいの区・地域によって担当が異なるため、
              公式ページで管轄を確認してください。
            </p>
          )}
        {offices.map((office) => {
          const source = sources.get(office.sourceId);
          const contactType = officeContactType(office, municipality.representativePhone);
          return (
            <article className="office-card" key={office.id}>
              <p className={`contact-rank ${contactType}`}>
                {contactType === "representative"
                  ? "代表電話・担当への取り次ぎが必要"
                  : contactType === "self-reliance"
                    ? "総合相談の直通・このまま話せます"
                    : "専用窓口の直通・このまま話せます"}
              </p>
              <h3>{officeDisplayName(office)}</h3>
              {officeOrganizationName(office) && (
                <p className="office-organization">{officeOrganizationName(office)}</p>
              )}
              {office.description && <p>{office.description}</p>}
              {(office.fax || office.email || office.contactFormUrl) && (
                <div className="non-phone-contacts">
                  <h4>電話が難しい場合</h4>
                  {office.fax && <p>FAX：{office.fax}</p>}
                  {office.email && (
                    <p>
                      <a href={`mailto:${office.email}`}>メールを送る</a>
                    </p>
                  )}
                  {office.contactFormUrl && (
                    <p>
                      <a href={office.contactFormUrl} target="_blank" rel="noreferrer">
                        オンライン相談・フォームを開く
                      </a>
                    </p>
                  )}
                </div>
              )}
              {office.phone && !office.fax && !office.email && !office.contactFormUrl && (
                <p className="phone-only-note">
                  この窓口で確認できた遠隔の連絡方法は電話のみです。来所できるかは公式ページで確認してください。
                </p>
              )}
              {office.phone && (
                <p>
                  <a
                    className="phone-button"
                    href={telephoneHref(office.phone)}
                    aria-label={telephoneAriaLabel(office.phone)}
                  >
                    電話する　<strong>{office.phone}</strong>
                  </a>
                </p>
              )}
              {!office.phone && municipality.representativePhone && category.id !== "violence" && (
                <div className="transfer-script">
                  <p>
                    この窓口の直通番号は未確認です。自治体の代表電話から担当につないでもらえます。
                  </p>
                  <a
                    className="phone-button"
                    href={telephoneHref(municipality.representativePhone)}
                    aria-label={telephoneAriaLabel(municipality.representativePhone)}
                  >
                    代表電話へ電話する　<strong>{municipality.representativePhone}</strong>
                  </a>
                </div>
              )}
              <dl className="office-details">
                <dt>受付時間</dt>
                <dd>
                  {office.openingHours ||
                    (shouldEstimateMunicipalHours({ ...office, contactType }) ? (
                      <UnconfirmedHours />
                    ) : (
                      "受付時間は未確認です。公式ページで確認してください。"
                    ))}
                </dd>
                {office.closedDays && (
                  <>
                    <dt>休み</dt>
                    <dd>{office.closedDays}</dd>
                  </>
                )}
                {office.address && (
                  <>
                    <dt>場所</dt>
                    <dd>{office.address}</dd>
                  </>
                )}
                {office.serviceArea && (
                  <>
                    <dt>管轄地域</dt>
                    <dd>{office.serviceArea}</dd>
                  </>
                )}
              </dl>
              {contactType === "representative" ? (
                <div className="transfer-script">
                  <h4>まず受付の人に</h4>
                  <p>「{transferTarget(category.id)}につないでください」</p>
                  <small>事情は、まだ話さなくて大丈夫です。</small>
                  <h4>「どのような用件ですか」と聞かれたら</h4>
                  <p>「生活のことで相談したいです」</p>
                  <h4>担当につながったら</h4>
                  <p>「{category.consultationScript}」</p>
                </div>
              ) : (
                <div className="direct-script">
                  <h4>電話で、こう伝えて大丈夫です</h4>
                  <p>「{category.consultationScript}」</p>
                </div>
              )}
              {source && (
                <p>
                  <a href={source.url} target="_blank" rel="noreferrer">
                    公式情報を確認する
                  </a>
                </p>
              )}
              <p className="note">
                {office.verificationLevel === "human_verified"
                  ? "運営者が公式ページで個別確認"
                  : office.verificationLevel === "user_reported"
                    ? "利用者からの報告により修正"
                    : "公式一覧・公式ページから転記"}
                ：{office.lastVerifiedAt || "未確認"}
              </p>
            </article>
          );
        })}
      </section>

      {offices.length > 0 && (
        <aside className="connection-fallback" aria-label="電話がつながらないときの代替手段">
          <h2>電話がつながらないとき</h2>
          <ol>
            <li>受付時間を確認し、時間内に少し間をあけてかけ直す</li>
            {offices.some(
              (office) =>
                office.availableMethods.includes("来所") && Boolean(office.address.trim()),
            ) && <li>安全に移動できる場合は、受付時間を確認して窓口へ直接行く</li>}
            {category.id !== "violence" && (
              <li>急ぐ場合は自治体の代表電話から担当につないでもらう</li>
            )}
          </ol>
          <p>つながらなかったことは、あなたの責任ではありません。</p>
        </aside>
      )}

      {offices.some(
        (office) =>
          officeContactType(office, municipality.representativePhone) === "representative",
      ) && (
        <aside className="transfer-tips" aria-label="電話を取り次いでもらうときの注意">
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
                {source && (
                  <p>
                    <a href={source.url} target="_blank" rel="noreferrer">
                      {source.title}
                    </a>
                  </p>
                )}
              </article>
            );
          })}
        </section>
      )}

      <section className="content-section related-guides">
        <h2>{municipality.name}のほかの困りごと</h2>
        <ul>
          {data.categories
            .filter((item) => item.id !== category.id)
            .map((item) => (
              <li key={item.id}>
                <Link href={`/support/${municipality.id}/${item.id}`}>
                  {seoCategoryContent(item.id).searchTitle}
                </Link>
              </li>
            ))}
        </ul>
      </section>

      {nearbyMunicipalities.length > 0 && (
        <section className="content-section related-guides">
          <h2>{prefecture.name}の他の自治体から探す</h2>
          <ul>
            {nearbyMunicipalities.map((item) => (
              <li key={item.id}>
                <Link href={`/support/${item.id}/${category.id}`}>
                  {item.name}で{seo.searchTitle}とき
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p>
        <a href={municipality.officialUrl} target="_blank" rel="noreferrer">
          {municipality.name}公式サイトを開く
        </a>
      </p>
      {!["violence", "mental"].includes(category.id) && (
        <p>
          <Link href={`/?need=${category.id}&municipality=${municipality.id}#support-results`}>
            検索画面でこの案内を見る・共有する
          </Link>
        </p>
      )}
      {!isSensitiveCategory(category.id) && (
        <FeedbackPrompt pageId={municipality.id} categoryId={category.id} />
      )}
      <p className="note">
        データ掲載・更新日：{municipality.lastVerifiedAt || "未確認"}
        。制度や受付時間は変わることがあります。
        利用前に公式情報または窓口で最新内容を確認してください。
      </p>
    </main>
  );
}
