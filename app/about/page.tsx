import Link from "next/link";

export default function AboutPage() {
  const operator = process.env.NEXT_PUBLIC_SITE_OPERATOR?.trim();
  return (
    <main id="main" className="page-shell content-page">
      <p className="eyebrow">サイト情報</p>
      <h1>このサイトについて</h1>

      <section className="content-section">
        <h2>目的</h2>
        <p>
          くらし支援ナビは、制度名が分からない人でも、生活の困りごとから公的な相談先や支援制度を
          探しやすくするための案内サイトです。
        </p>
      </section>

      <section className="content-section">
        <h2>免責事項</h2>
        <p>
          掲載内容は公的機関の一次情報をもとに確認していますが、制度、対象条件、受付時間、
          連絡先などが変更されている場合があります。申請や相談の前に、掲載した公式出典または
          担当窓口で最新情報をご確認ください。
        </p>
        <p>
          このサイトは緊急機関ではありません。生命や身体に差し迫った危険がある場合は、
          ページ上部の緊急連絡先を利用してください。
        </p>
      </section>

      <section className="content-section">
        <h2>個人情報について</h2>
        <p>
          現在の検索機能は、選択した困りごとや地域をサーバーへ送信せず、ブラウザ内で絞り込みます。
          このサイト上に相談内容を入力するフォームはありません。
        </p>
        <p>
          訂正依頼をメールで送る場合、メールアドレスと本文は利用者が使用するメールサービスを通じて
          運営者へ送信されます。住所、病歴、被害内容など、不要な個人情報は記載しないでください。
          ホスティング移行時には、アクセスログやCookieの取り扱いを改めて明記する必要があります。
        </p>
      </section>

      <section className="content-section">
        <h2>運営者</h2>
        {operator
          ? <p>{operator}</p>
          : <p className="configuration-warning">運営者情報は未設定です。一般公開前に環境変数で設定する必要があります。</p>}
      </section>

      <p><Link href="/corrections">掲載情報の訂正を依頼する</Link></p>
      <p><Link href="/">トップページへ戻る</Link></p>
    </main>
  );
}
