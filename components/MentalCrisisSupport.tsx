export default function MentalCrisisSupport() {
  return (
    <aside className="mental-crisis-support" aria-labelledby="mental-crisis-title">
      <h2 id="mental-crisis-title">今、安全を保つための相談先</h2>
      <p>うまく説明できなくても大丈夫です。つながった人に「消えたい」と伝えてください。</p>
      <div className="mental-crisis-options">
        <section>
          <h3>今すぐ危険</h3>
          <p>
            <a href="tel:110">110（警察）</a>
            <a href="tel:119">119（救急）</a>
          </p>
        </section>
        <section>
          <h3>電話相談</h3>
          <a href="tel:0570064556">こころの健康相談統一ダイヤル 0570-064-556</a>
          <small>受付時間は地域により異なります</small>
        </section>
        <section>
          <h3>無料・24時間</h3>
          <a href="tel:0120279338">よりそいホットライン 0120-279-338</a>
        </section>
        <section>
          <h3>電話が難しい</h3>
          <a
            href="https://www.mhlw.go.jp/mamorouyokokoro/soudan/sns/"
            target="_blank"
            rel="noreferrer"
          >
            厚生労働省 SNS・チャット相談一覧
          </a>
        </section>
      </div>
    </aside>
  );
}
