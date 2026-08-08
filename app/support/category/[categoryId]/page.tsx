import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { emergencyContacts } from "@/lib/emergency-contacts";
import { getPublicPortalData } from "@/lib/data/repository";
import { buildOfficeIndex, indexableMunicipalitiesFor } from "@/lib/seo-analysis";
import { isSensitiveCategory, sensitiveSupportMetadata } from "@/lib/privacy";
import { seoCategoryContent } from "@/lib/seo-content";
import { SITE_URL } from "@/lib/site";
import { telephoneAriaLabel } from "@/lib/telephone";

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
  const sensitive = isSensitiveCategory(page.category.id);
  const title = sensitive
    ? sensitiveSupportMetadata.title
    : `${page.seo.searchTitle}ときの相談窓口を地域から探す`;
  const description = sensitive
    ? sensitiveSupportMetadata.description
    : `${page.seo.summary} 全国1,741市区町村から、お住まいの地域の公的な相談先と電話での伝え方を確認できます。`;
  return {
    title,
    description,
    alternates: { canonical: `/support/category/${page.category.id}` },
    openGraph: {
      title,
      description,
      url: `/support/category/${page.category.id}`,
      type: "website",
    },
    robots: sensitive
      ? { index: false, follow: true, noarchive: true, nosnippet: true }
      : undefined,
    twitter: sensitive
      ? {
          card: "summary",
          title: sensitiveSupportMetadata.title,
          description: sensitiveSupportMetadata.description,
        }
      : undefined,
  };
}

export default async function CategoryDirectoryPage({ params }: PageProps) {
  const page = await getCategoryPage(params);
  if (!page) notFound();
  const officeIndex = buildOfficeIndex(page.data.offices);
  const prefecturesWithLocalValue = page.data.prefectures
    .map((prefecture) => ({
      ...prefecture,
      count: indexableMunicipalitiesFor(page.data, officeIndex, prefecture.code, page.category.id)
        .length,
    }))
    .filter((prefecture) => prefecture.count > 0);
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

      {page.seo.firstSteps && (
        <section className="content-section category-answer" aria-labelledby="first-steps-title">
          <h2 id="first-steps-title">まず、次の順番で動いてください</h2>
          <ol>
            {page.seo.firstSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p>
            すべてできなくても大丈夫です。いちばん急いでいることを、相談先へそのまま伝えてください。
          </p>
        </section>
      )}

      {page.category.id === "violence" && (
        <section className="content-section urgent-directory" aria-labelledby="urgent-dv-title">
          <h2 id="urgent-dv-title">いま、この場で使える相談先</h2>
          <p>
            今すぐ危険がある場合は110へ連絡してください。電話できない場合は、
            安全な端末からチャットを利用できます。
          </p>
          <EmergencyDirectoryLinks
            ids={["police-emergency", "dv-consultation", "dv-consultation-plus"]}
          />
          <p>
            <a href="https://form.soudanplus.jp/ja" target="_blank" rel="noreferrer">
              DV相談＋ チャット（12時～22時）
            </a>
          </p>
          <p>画面上部の「すぐ閉じる」で、いつでも別のページへ移動できます。</p>
        </section>
      )}

      {page.category.id === "mental" && (
        <section className="content-section urgent-directory" aria-labelledby="urgent-mental-title">
          <h2 id="urgent-mental-title">いま、この場で使える相談先</h2>
          <p>自分や誰かを傷つける差し迫った危険がある場合は、110または119へ連絡してください。</p>
          <EmergencyDirectoryLinks
            ids={[
              "police-emergency",
              "fire-ambulance-emergency",
              "mental-health",
              "yorisoi-hotline",
            ]}
          />
          <p>
            <a
              href="https://www.mhlw.go.jp/mamorouyokokoro/soudan/sns/"
              target="_blank"
              rel="noreferrer"
            >
              厚生労働省 SNS・チャット相談一覧
            </a>
          </p>
        </section>
      )}

      <section className="content-section">
        <h2>相談するとき最初に伝えること</h2>
        <p>{page.seo.firstAction}</p>
        <p>
          制度名が分からなくても相談できます。窓口では、困っていることと、今日・数日以内に
          対応が必要かを伝えてください。
        </p>
      </section>

      {page.seo.supportOptions && (
        <section className="content-section" aria-labelledby="support-options-title">
          <h2 id="support-options-title">利用できる可能性がある制度・相談</h2>
          <p>対象や支援内容は、収入、世帯、地域などによって異なります。窓口で確認してください。</p>
          <dl className="category-option-list">
            {page.seo.supportOptions.map((option) => (
              <div key={option.title}>
                <dt>
                  {option.guideSlug ? (
                    <Link href={`/guide/${option.guideSlug}`}>{option.title}</Link>
                  ) : (
                    option.title
                  )}
                </dt>
                <dd>{option.description}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {page.seo.whatToPrepare && (
        <section className="content-section" aria-labelledby="prepare-title">
          <h2 id="prepare-title">相談前に用意できるもの</h2>
          <ul>
            {page.seo.whatToPrepare.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p>
            そろっていなくても、相談を後回しにする必要はありません。手元にあるものだけで相談できます。
          </p>
        </section>
      )}

      <section className="content-section" aria-labelledby="area-directory-title">
        <h2 id="area-directory-title">都道府県から相談先を探す</h2>
        <p>都道府県を選ぶと、次のページで市区町村を選べます。</p>
        <ul className="directory-grid">
          {prefecturesWithLocalValue.map((prefecture) => (
            <li key={prefecture.code}>
              <Link href={`/support/category/${page.category.id}/${prefecture.code}`}>
                {prefecture.name}
                <small>{prefecture.count}自治体</small>
              </Link>
            </li>
          ))}
        </ul>
        {prefecturesWithLocalValue.length < page.data.prefectures.length && (
          <p>
            地域固有の専門窓口が未整備の地域でも、トップの検索機能から全国・都道府県共通の
            相談先を確認できます。
          </p>
        )}
      </section>

      {page.seo.relatedCases ? (
        <section className="content-section related-guides" aria-labelledby="related-cases-title">
          <h2 id="related-cases-title">あわせて困っていることから探す</h2>
          <ul>
            {page.seo.relatedCases.map((related) => (
              <li key={related.categoryId}>
                <Link href={`/support/category/${related.categoryId}`}>
                  <strong>{related.label}</strong>
                  <span>{related.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="content-section">
          <h2>関連する検索語</h2>
          <p>{page.seo.relatedTerms.join("、")}</p>
        </section>
      )}
    </main>
  );
}

function EmergencyDirectoryLinks({ ids }: { ids: string[] }) {
  return (
    <ul>
      {ids.map((id) => {
        const contact = emergencyContacts.find((item) => item.id === id);
        if (!contact) return null;
        const label =
          contact.id === "mental-health"
            ? "こころの健康相談統一ダイヤル"
            : contact.id === "dv-consultation"
              ? "DV相談ナビ"
              : contact.label;
        return (
          <li key={contact.id}>
            <strong>{label}：</strong>{" "}
            <a href={contact.phoneHref} aria-label={telephoneAriaLabel(contact.number, label)}>
              {contact.number}
            </a>{" "}
            （{contact.cost}・{contact.availability}）
            <a href={contact.officialUrl} target="_blank" rel="noreferrer">
              公式情報
            </a>
          </li>
        );
      })}
    </ul>
  );
}
