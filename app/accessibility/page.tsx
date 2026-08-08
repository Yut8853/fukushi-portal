import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "アクセシビリティ方針と対応状況",
  description:
    "くらし支援ナビのアクセシビリティ目標、試験対象、確認環境、既知の課題、連絡先を公開します。",
  alternates: { canonical: "/accessibility" },
};

export default function AccessibilityPage() {
  return (
    <main id="main" className="page-shell content-page">
      <p className="eyebrow">利用しやすさに関する情報</p>
      <h1>アクセシビリティ方針と対応状況</h1>
      <p className="lead">
        くらし支援ナビは、障害の有無、利用する端末や入力方法にかかわらず、生活に困った人が
        相談先へたどり着けることを目標に改善を続けます。
      </p>

      <section className="content-section">
        <h2>目標</h2>
        <p>
          JIS X 8341-3:2016の適合レベルAA、およびWCAG 2.2のレベルAAを目標とします。
          現在は適合宣言を行っておらず、このページは目標と確認状況を公開するものです。
        </p>
      </section>

      <section className="content-section">
        <h2>対象範囲</h2>
        <p>公開中の主要な利用導線を対象とします。</p>
        <ul>
          <li>トップページと相談先検索の各ステップ</li>
          <li>困りごとカテゴリーページ</li>
          <li>都道府県、市区町村、相談窓口のページ</li>
          <li>制度解説ページ</li>
          <li>このサイトについて、編集方針、訂正窓口</li>
        </ul>
        <p>外部サイト、リンク先のPDF、外部サービスの画面は対象外です。</p>
      </section>

      <section className="content-section">
        <h2>自動確認の構成</h2>
        <ul>
          <li>Playwrightとaxeによる主要9画面のアクセシビリティ検査</li>
          <li>キーボードフォーカスの可視性と検索ステップ移動後のフォーカス位置</li>
          <li>320px幅および200％相当での横スクロールの有無</li>
          <li>DVページのEscキーによる緊急退出</li>
          <li>見出し、フォームラベル、リンク名などの機械的な検査</li>
        </ul>
        <p>
          自動検査だけでは、使いやすさや規格への適合を保証できません。2026年8月8日に Node.js
          22の本番ビルドを使い、Chromiumとaxeによる主要9画面の検査が完了しました。
        </p>
      </section>

      <section className="content-section">
        <h2>人による確認の状況</h2>
        <p>
          NVDA、VoiceOver、TalkBackによる一連の操作確認、400％相当の拡大、テキスト間隔の変更、
          固定要素によるフォーカスの隠れについては、公開後の定期確認項目として整備中です。
          一連の試験が完了するまでは「確認済み」と表示しません。
        </p>
        <dl className="accessibility-status-list">
          <div>
            <dt>自動検査</dt>
            <dd>主要9画面をChromiumとaxeで確認（2026年8月8日）</dd>
          </div>
          <div>
            <dt>キーボード操作</dt>
            <dd>主要導線を自動確認。人による全体確認は未完了</dd>
          </div>
          <div>
            <dt>スクリーンリーダー</dt>
            <dd>NVDA・VoiceOver・TalkBackでの確認を準備中</dd>
          </div>
          <div>
            <dt>拡大・リフロー</dt>
            <dd>320px幅・200％相当を自動確認。400％相当は人による確認が未完了</dd>
          </div>
          <div>
            <dt>最終更新</dt>
            <dd>2026年8月8日</dd>
          </div>
        </dl>
      </section>

      <section className="content-section">
        <h2>把握している課題</h2>
        <ul>
          <li>すべてのOS・ブラウザー・支援技術の組み合わせでは確認できていません。</li>
          <li>外部の公式情報には、画像PDFや複雑な表など読みづらい形式が含まれる場合があります。</li>
          <li>
            長い自治体名、窓口名、制度名を含む画面の拡大表示を継続して確認する必要があります。
          </li>
          <li>
            受付時間などの補助情報に、小さく感じられる表示が残っていないか人による確認が必要です。
          </li>
        </ul>
      </section>

      <section className="content-section">
        <h2>問題を見つけた場合</h2>
        <p>
          操作できない、読み上げ内容が分かりにくい、文字を拡大すると内容が隠れるなどの問題は、
          <Link href="/corrections">情報の訂正・お問い合わせ</Link>からお知らせください。
          使用した端末、ブラウザー、支援技術、問題が起きたページが分かると確認しやすくなります。
        </p>
      </section>
    </main>
  );
}
