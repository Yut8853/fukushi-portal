"use client";

import { useEffect } from "react";

const safeUrl = "https://weather.yahoo.co.jp/weather/";

function leaveImmediately() {
  window.location.replace(safeUrl);
}

export default function QuickExit() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") leaveImmediately();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <aside className="quick-exit" aria-label="安全のための画面終了">
      <button type="button" onClick={leaveImmediately}>
        すぐ閉じる <span>Esc</span>
      </button>
      <details>
        <summary>閲覧履歴に注意</summary>
        <p>
          このボタンは天気予報へ移動しますが、履歴は消しません。安全な端末やプライベートブラウズを使い、
          必要ならブラウザの履歴を削除してください。
        </p>
      </details>
    </aside>
  );
}
