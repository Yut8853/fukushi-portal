import type { Metadata } from "next";
import Link from "next/link";
import { getPublicPortalData } from "@/lib/data/repository";
import { getPublicStats } from "@/lib/public-stats";
import { serializeJsonLd } from "@/lib/json-ld";
import { SITE_URL } from "@/lib/site";

const REPOSITORY_URL = "https://github.com/Yut8853/fukushi-portal";
const RAW_DATA_BASE = "https://raw.githubusercontent.com/Yut8853/fukushi-portal/main/data";

export const metadata: Metadata = {
  title: "公開データについて",
  description:
    "くらし支援ナビが整理する全国自治体の福祉相談窓口データについて、収録範囲、検証方法、更新方針、ライセンス、CSVの入手先を説明します。",
  alternates: { canonical: "/data" },
};

export default async function DataPage() {
  const data = await getPublicPortalData();
  const stats = getPublicStats();
  const pageUrl = `${SITE_URL}/data`;
  const distributions = [
    {
      name: "相談窓口データ",
      file: "offices.csv",
      description: "窓口名、連絡方法、担当区域、出典、確認日など",
    },
    {
      name: "自治体データ",
      file: "municipalities.csv",
      description: "自治体コード、名称、公式サイト、代表電話など",
    },
    {
      name: "制度データ",
      file: "programs.csv",
      description: "制度名、対象、支援内容、申請の流れ、出典など",
    },
    {
      name: "出典データ",
      file: "sources.csv",
      description: "一次情報の名称、URL、発行者、確認日など",
    },
  ];
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": pageUrl,
        url: pageUrl,
        name: "公開データについて",
        inLanguage: "ja",
        isPartOf: { "@id": `${SITE_URL}/#website` },
        mainEntity: { "@id": `${pageUrl}#dataset` },
      },
      {
        "@type": "Dataset",
        "@id": `${pageUrl}#dataset`,
        name: "くらし支援ナビ 全国の生活・福祉相談窓口データ",
        description:
          "全国1,741市区町村の生活保護、生活困窮、住まい、福祉などの公的相談窓口を、公式情報の出典と確認日付きで整理したデータセットです。",
        url: pageUrl,
        sameAs: `${REPOSITORY_URL}/tree/main/data`,
        creator: { "@id": `${SITE_URL}/#organization` },
        publisher: { "@id": `${SITE_URL}/#organization` },
        dateModified: stats.dataGeneratedAt,
        license: "https://creativecommons.org/licenses/by/4.0/",
        isAccessibleForFree: true,
        inLanguage: "ja",
        spatialCoverage: { "@type": "Place", name: "日本" },
        keywords: ["福祉", "生活保護", "生活困窮", "相談窓口", "自治体", "オープンデータ"],
        distribution: distributions.map((item) => ({
          "@type": "DataDownload",
          name: item.name,
          encodingFormat: "text/csv",
          contentUrl: `${RAW_DATA_BASE}/${item.file}`,
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "トップ", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "公開データについて", item: pageUrl },
        ],
      },
    ],
  };

  return (
    <main id="main" className="page-shell content-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <nav className="breadcrumbs" aria-label="パンくず">
        <Link href="/">トップ</Link>
        <span>公開データについて</span>
      </nav>
      <p className="eyebrow">全国の公的相談窓口を整理する</p>
      <h1>公開データについて</h1>
      <p className="lead">
        くらし支援ナビは、国・都道府県・市区町村の公式情報をもとに、相談先へつながるためのデータを整理・公開しています。
      </p>

      <section className="data-summary" aria-label="データの概要">
        <div>
          <strong>{data.municipalities.length.toLocaleString("ja-JP")}</strong>
          <span>市区町村</span>
        </div>
        <div>
          <strong>{stats.publishedOffices.toLocaleString("ja-JP")}</strong>
          <span>公開窓口</span>
        </div>
        <div>
          <strong>{stats.localSpecialistPages.toLocaleString("ja-JP")}</strong>
          <span>地域固有の専門窓口ページ</span>
        </div>
        <div>
          <strong>{data.sources.length.toLocaleString("ja-JP")}</strong>
          <span>公開出典</span>
        </div>
      </section>

      <section className="content-section">
        <h2>どのように整理しているか</h2>
        <ol>
          <li>国、都道府県、市区町村などの公式一覧・公式ページを優先して収集します。</li>
          <li>窓口名、連絡方法、担当区域、対象条件、出典、確認日を分けて記録します。</li>
          <li>確認できない受付時間や条件は推測で補わず、空欄または未確認として扱います。</li>
          <li>
            自治体代表、専門窓口、都道府県・全国共通窓口を区別し、誤った地域へ案内しないよう検査します。
          </li>
          <li>地域固有で連絡可能な専門窓口があるページだけを検索エンジンの登録対象にします。</li>
        </ol>
        <p>
          <Link href="/editorial-policy">詳しい編集・検証方針を見る</Link>
        </p>
      </section>

      <section className="content-section">
        <h2>CSVデータ</h2>
        <p>
          GitHubの公開リポジトリから取得できます。列の意味や関連ファイルはリポジトリのREADMEも確認してください。
        </p>
        <dl className="data-download-list">
          {distributions.map((item) => (
            <div key={item.file}>
              <dt>
                <a href={`${RAW_DATA_BASE}/${item.file}`}>{item.name}（CSV）</a>
              </dt>
              <dd>{item.description}</dd>
            </div>
          ))}
        </dl>
        <p>
          <a href={`${REPOSITORY_URL}/tree/main/data`}>GitHubでdataディレクトリを見る</a>
        </p>
        <p>
          <a href={`${SITE_URL}/public-stats.json`}>公開件数の集計JSONを見る</a>
        </p>
      </section>

      <section className="content-section">
        <h2>ライセンスと利用時の注意</h2>
        <p>
          データベースの構成、独自の説明文、整理・編集部分は、特記がない限りCC BY
          4.0で利用できます。利用時は「くらし支援ナビ（運営:
          JUNKBRANDING）」と、可能であればサイトまたはリポジトリへのリンクを表示してください。
        </p>
        <p>
          国や自治体など第三者が作成した原資料、文章、画像、ロゴには、このライセンスを付与していません。各発行元の利用条件も確認してください。
        </p>
        <p>
          <a href={`${REPOSITORY_URL}/blob/main/DATA_LICENSE.md`}>データライセンス全文を見る</a>
        </p>
      </section>

      <section className="content-section">
        <h2>更新と訂正</h2>
        <p>
          公開統計の生成日：{stats.dataGeneratedAt}
          。各レコードには個別の確認日があり、更新時期は異なります。正確性・最新性は保証されないため、支援の利用前には必ず公式情報または窓口へ確認してください。
        </p>
        <p>
          誤りや変更を見つけた場合は<Link href="/corrections">訂正窓口</Link>からお知らせください。
        </p>
      </section>
    </main>
  );
}
