import type { Metadata } from "next";
import Link from "next/link";
import SupportFinder from "@/components/SupportFinder";
import { getPublicPortalData } from "@/lib/data/repository";
import { toFinderViewModel } from "@/lib/data/view-models";
import { getPublicStats } from "@/lib/public-stats";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const data = toFinderViewModel(await getPublicPortalData());
  const stats = getPublicStats();
  const [updatedYear, updatedMonth, updatedDay] = data.latestVerifiedAt.split("-");
  return (
    <main id="main" className="page-shell">
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">制度名を知らなくても大丈夫です</p>
          <h1 className="hero-title">
            <span>いまの困りごとから、</span>
            <span>相談先を探せます。</span>
          </h1>
          <p className="lead">
            状況をひとつ選ぶだけで、今日できることと公的な相談先を分かりやすく案内します。
            名前や住所の入力は不要です。
          </p>
          <p className="coverage-proof">
            全国1,741すべての市区町村で、生活困窮・生活保護・住まいの相談窓口を収録しています。
            介護・障害・DVなど専門分野の地域窓口は、順次整備中です。掲載情報は国・自治体の
            公式一覧や公式ページから転記・整理し、未確認の項目はその旨を表示しています。
            <small>
              公開窓口：{stats.publishedOffices.toLocaleString("ja-JP")}件 ／
              地域固有の専門窓口がある検索ページ：
              {stats.localSpecialistPages.toLocaleString("ja-JP")}件
              <br />
              サイト全体の最終更新：
              {updatedYear && updatedMonth && updatedDay
                ? `${updatedYear}年${Number(updatedMonth)}月${Number(updatedDay)}日`
                : "未確認"}
            </small>
          </p>
          <p className="multilingual-link">
            <a
              href="https://www.moj.go.jp/isa/support/fresc/fresc01.html"
              target="_blank"
              rel="noreferrer"
            >
              English / 中文 / Tiếng Việt → 外国人向け相談窓口（FRESC）
            </a>
          </p>
          <a className="hero-button" href="#support-finder">
            相談先を探す
          </a>
        </div>
        <aside className="hero-guide" aria-label="このサイトでできること">
          <p>このサイトで分かること</p>
          <ol>
            <li>
              <span>1</span>まず、どこへ相談するか
            </li>
            <li>
              <span>2</span>電話で何と伝えるか
            </li>
            <li>
              <span>3</span>手元にあるとよいもの
            </li>
          </ol>
        </aside>
      </header>

      <SupportFinder data={data} />

      <section className="content-section directory-cta" aria-labelledby="directory-title">
        <h2 id="directory-title">地域の相談先一覧から探す</h2>
        <p>全国47都道府県・1,741自治体のページを、都道府県から選べます。</p>
        <Link className="official-link" href="/support">
          地域別の相談先一覧を開く
        </Link>
      </section>

      <section className="content-section" aria-labelledby="information-policy-title">
        <h2 id="information-policy-title">情報を利用するときに</h2>
        <p>
          支援の条件や受付時間は変わることがあります。各案内のデータ掲載・更新日と公式出典を確認し、
          申請前に窓口へ最新情報をお問い合わせください。
        </p>
      </section>
    </main>
  );
}
