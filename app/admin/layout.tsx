import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";

export const metadata: Metadata = {
  robots: { index: false, follow: false, noarchive: true },
};

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const requestHeaders = await headers();
  const user = requestHeaders.get("x-admin-user") ?? "";
  const role = requestHeaders.get("x-admin-role") ?? "";
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
            {user ? (
              <span aria-label="ログイン中の管理者">
                {user}（{role}）
              </span>
            ) : null}
          </div>
        </div>
      </nav>
      {children}
    </>
  );
}
