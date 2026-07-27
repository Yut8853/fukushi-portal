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
          このサイトは個人が運営する情報案内サイトであり、行政機関、医療機関、法律事務所、
          支援団体ではありません。個別の生活相談は受け付けず、支援の提供、仲介、受給や解決の
          保証も行いません。相談は掲載先の各窓口へ直接お寄せください。
        </p>
        <p>
          掲載内容は公的機関の一次情報をもとに確認していますが、制度、対象条件、受付時間、
          連絡先などの最新性・正確性を保証するものではありません。制度内容、対象条件、受給可否は、
          申請や相談の前に掲載した公式出典または担当窓口でご確認ください。
        </p>
        <p>
          このサイトは緊急機関ではありません。生命や身体に差し迫った危険がある場合は、
          ページ上部の緊急連絡先を利用してください。
        </p>
        <p>
          個人運営のため、予告なく更新頻度を下げたり、公開を休止・終了したりする場合があります。
          掲載情報の確認が180日以上止まった場合は、検索画面に注意を表示します。
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

      <p>掲載情報の誤りは、<Link href="/corrections">訂正窓口</Link>からお知らせください。</p>
      <p><Link href="/">トップページへ戻る</Link></p>
    </main>
  );
}
