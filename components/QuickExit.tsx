"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const safeUrl = "https://weather.yahoo.co.jp/weather/";

function leaveImmediately() {
  window.location.replace(safeUrl);
}

export default function QuickExit() {
  const pathname = usePathname();
  const [finderViolenceSelected, setFinderViolenceSelected] = useState(false);
  const escapeEnabled = pathname.endsWith("/violence") || finderViolenceSelected;

  useEffect(() => {
    const onCategoryChange = (event: Event) => {
      const categoryId = (event as CustomEvent<{ categoryId?: string }>).detail?.categoryId;
      setFinderViolenceSelected(categoryId === "violence");
    };
    window.addEventListener("support-category-change", onCategoryChange);
    return () => window.removeEventListener("support-category-change", onCategoryChange);
  }, []);

  useEffect(() => {
    if (!escapeEnabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.isComposing || event.keyCode === 229) return;
      const activeElement = document.activeElement;
      if (
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLSelectElement ||
        activeElement instanceof HTMLButtonElement ||
        activeElement instanceof HTMLAnchorElement
      ) {
        return;
      }
      if (document.querySelector("details[open]")) return;
      leaveImmediately();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [escapeEnabled]);

  return (
    <aside className="quick-exit" aria-label="安全のための画面終了">
      <button type="button" onClick={leaveImmediately}>
        すぐ閉じる {escapeEnabled && <span>Esc</span>}
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
