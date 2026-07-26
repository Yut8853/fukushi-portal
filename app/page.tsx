import SupportFinder from "@/components/SupportFinder";
import { getPublicPortalData } from "@/lib/data/repository";
import { toFinderViewModel } from "@/lib/data/view-models";

export default async function HomePage() {
  const data = toFinderViewModel(await getPublicPortalData());
  return (
    <main id="main" className="page-shell">
      <header className="hero">
        <p className="eyebrow">制度名が分からなくても大丈夫です</p>
        <h1>生活に困ったとき、<br />今日できることを探す</h1>
        <p className="lead">
          今いる地域と困りごとを選ぶと、相談先、伝える言葉、必要なものをまとめて表示します。
        </p>
      </header>

      <SupportFinder data={data} />

      <section className="content-section" aria-labelledby="information-policy-title">
        <h2 id="information-policy-title">情報を利用するときに</h2>
        <p>
          支援の条件や受付時間は変わることがあります。各案内に表示された情報確認日と公式出典を確認し、
          申請前に窓口へ最新情報をお問い合わせください。
        </p>
      </section>
    </main>
  );
}
