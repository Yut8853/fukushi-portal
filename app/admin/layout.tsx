import Link from "next/link";

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <nav className="admin-nav" aria-label="管理メニュー">
        <div className="admin-nav-inner">
          <strong>データ管理</strong>
          <div>
            <Link href="/admin/municipalities">自治体</Link>
            <Link href="/admin/review">候補レビュー</Link>
            <Link href="/admin/crawl-jobs">クロール状況</Link>
            <Link href="/admin/sources">出典</Link>
          </div>
        </div>
      </nav>
      {children}
    </>
  );
}
