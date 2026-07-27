"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // VercelのRuntime Logsで検知できるよう、相談内容を含めず技術情報だけを記録します。
    console.error("Unhandled application error", {
      name: error.name,
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <html lang="ja">
      <body>
        <main className="page-shell content-page">
          <h1>ページを表示できませんでした</h1>
          <p>時間をおいて、もう一度お試しください。</p>
          <button type="button" onClick={reset}>
            もう一度試す
          </button>
          <p>
            <Link href="/">トップページへ戻る</Link>
          </p>
        </main>
      </body>
    </html>
  );
}
