import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div>
          <strong>くらし支援ナビ</strong>
          <p>制度名を知らなくても、生活の困りごとから相談先を探すための案内サイトです。</p>
        </div>
        <nav aria-label="サイト情報">
          <Link href="/about">このサイトについて・免責事項</Link>
          <Link href="/corrections">情報の訂正・お問い合わせ</Link>
        </nav>
      </div>
    </footer>
  );
}
