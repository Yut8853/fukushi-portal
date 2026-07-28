import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "編集・検証方針",
  description: "くらし支援ナビの情報収集、検証、AI利用、訂正、更新停止時の方針を説明します。",
  alternates: { canonical: "/editorial-policy" },
};

export default function EditorialPolicyPage() {
  return (
    <main id="main" className="page-shell content-page">
      <p className="eyebrow">信頼性に関する情報</p>
      <h1>編集・検証方針</h1>

      <section className="content-section">
        <h2>このサイトを作る理由</h2>
        <p>
          困っているときに制度名や行政の組織名を調べる負担を減らし、「次にどこへ連絡し、
          何を伝えるか」まで分かる入口を作ることが目的です。窓口を並べるだけでなく、
          一度つながらなかった人にも別の入口が残る案内を重視します。
        </p>
      </section>

      <section className="content-section">
        <h2>収集と確認</h2>
        <ul>
          <li>国、都道府県、市区町村などが公開する一次情報を優先します。</li>
          <li>窓口名、連絡先、担当区域、出典、確認日を記録します。</li>
          <li>公式情報から安全に確認できない受付時間や条件は、推測せず空欄にします。</li>
          <li>自治体代表と専門窓口を区別し、同じ電話番号の役割は1枚の案内へ統合します。</li>
          <li>自動検証で列ずれ、電話番号、主要導線、出典の到達可否などを公開前に確認します。</li>
        </ul>
      </section>

      <section className="content-section">
        <h2>検索掲載の基準</h2>
        <p>
          自治体名だけを差し替えたページを検索結果へ大量に出さないため、その自治体に固有で、
          公式出典と確認日があり、実際に連絡できる専門窓口を含むページだけを検索対象にします。
          全国共通・都道府県共通の窓口だけのページや、自治体代表しかないページはサイト内では
          利用できますが、検索エンジンには登録しない設定にします。
        </p>
      </section>

      <section className="content-section">
        <h2>AI・自動処理の利用</h2>
        <p>
          AIやプログラムは、公開情報の候補抽出、表記の整理、重複検出、検証コードの作成に
          使用する場合があります。AIの出力だけを根拠に電話番号、受付時間、対象条件を掲載せず、
          公式出典で確認できない内容を補完しません。個別相談への回答や受給可否の判定にも
          使用しません。
        </p>
      </section>

      <section className="content-section">
        <h2>訂正・非掲載・更新停止</h2>
        <p>
          命や安全に関わる連絡先、対象地域、受付条件の誤りを優先して訂正します。出典を確認できない
          情報、管轄を安全に特定できない情報、誤案内につながる曖昧な情報は隔離または非掲載にします。
          掲載情報の確認が180日以上止まった場合は画面に注意を表示します。
        </p>
        <p>
          誤りを見つけた場合は<Link href="/corrections">情報の訂正・お問い合わせ</Link>から
          お知らせください。変更履歴と検証コードは
          <a
            href="https://github.com/Yut8853/fukushi-portal"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHubの公開リポジトリ
          </a>
          で確認できます。
        </p>
      </section>

      <p>
        <Link href="/about">このサイトについてへ戻る</Link>
      </p>
    </main>
  );
}
