import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div>
          <strong>くらし支援ナビ</strong>
          <p>制度名を知らなくても、生活の困りごとから相談先を探すための案内サイトです。</p>
          <p className="footer-disclaimer">
            個人運営の情報案内サイトです。行政機関・支援団体ではなく、相談受付、支援の仲介・保証は行いません。
          </p>
        </div>
        <nav aria-label="サイト情報">
          <Link href="/about">このサイトについて・免責事項</Link>
          <Link href="/editorial-policy">編集・検証方針</Link>
          <Link href="/corrections">情報の訂正・お問い合わせ</Link>
        </nav>
      </div>
    </footer>
  );
}
