import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="site-brand" href="/">
          <span className="site-brand-mark" aria-hidden="true">
            く
          </span>
          <strong>くらし支援ナビ</strong>
        </Link>
        <nav className="site-nav" aria-label="メインメニュー">
          <Link href="/#support-finder">相談先を探す</Link>
          <Link href="/guide">制度を調べる</Link>
          <Link href="/about">このサイトについて</Link>
        </nav>
      </div>
    </header>
  );
}
