import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="site-brand" href="/" aria-label="くらし支援ナビ トップページ">
          <span className="site-brand-mark" aria-hidden="true">く</span>
          <span>
            <strong>くらし支援ナビ</strong>
            <small>生活の困りごとから相談先を探す</small>
          </span>
        </Link>
        <nav className="site-nav" aria-label="メインメニュー">
          <Link href="/#support-finder">相談先を探す</Link>
          <Link href="/about">このサイトについて</Link>
        </nav>
      </div>
    </header>
  );
}
