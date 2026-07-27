import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "掲載情報の訂正・お問い合わせ",
  description: "くらし支援ナビに掲載された電話番号、受付時間、制度内容、リンク切れなどの訂正窓口です。",
  alternates: { canonical: "/corrections" },
};

export default function CorrectionsPage() {
  const email = process.env.NEXT_PUBLIC_CORRECTION_EMAIL?.trim();
  const subject = encodeURIComponent("くらし支援ナビ 掲載情報の訂正依頼");
  const body = encodeURIComponent([
    "※この窓口では個別の生活相談を受け付けていません。",
    "",
    "訂正が必要なページまたは自治体名:",
    "",
    "訂正が必要な内容:",
    "",
    "確認できる公的な出典URL:",
    "",
    "個人の住所、病歴、被害内容などは記載しないでください。",
  ].join("\n"));

  return (
    <main id="main" className="page-shell content-page">
      <p className="eyebrow">情報品質</p>
      <h1>掲載情報の訂正・お問い合わせ</h1>

      <section className="content-section">
        <h2>訂正をお知らせください</h2>
        <p className="consultation-warning">
          <strong>この窓口では、個別の生活相談にはお答えできません。</strong><br />
          お急ぎの場合や生命・身体に危険がある場合は、ページ上部の緊急連絡先または掲載された公的窓口へ
          直接ご相談ください。
        </p>
        <p>
          電話番号、受付時間、制度内容、リンク切れなどに誤りがある場合は、対象の自治体名、
          訂正内容、公的な出典URLをお知らせください。確認後、公開情報を修正します。
        </p>
        <p>安全のため、相談内容や健康状態などの個人情報は送らないでください。</p>
        {email
          ? (
            <a className="contact-button" href={`mailto:${email}?subject=${subject}&body=${body}`}>
              訂正依頼メールを作成する
            </a>
          )
          : (
            <p className="configuration-warning">
              訂正窓口のメールアドレスは未設定です。一般公開前に
              <code>NEXT_PUBLIC_CORRECTION_EMAIL</code>を設定してください。
            </p>
          )}
      </section>

      <section className="content-section">
        <h2>運用上の取り扱い</h2>
        <ol>
          <li>依頼内容と公的な一次情報を照合します。</li>
          <li>危険な誤情報は公開停止または訂正を優先します。</li>
          <li>確認できない場合は、情報を推測せず<code>review_required</code>として再調査します。</li>
          <li>修正後に情報確認日を更新します。</li>
        </ol>
      </section>

      <p><Link href="/">トップページへ戻る</Link></p>
    </main>
  );
}
