"use client";

import { useState } from "react";

type FeedbackPromptProps = {
  pageId: string;
  categoryId: string;
};

export default function FeedbackPrompt({ pageId, categoryId }: FeedbackPromptProps) {
  const [answered, setAnswered] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const answer = async (helpful: boolean) => {
    setSending(true);
    setError("");
    window.dispatchEvent(
      new CustomEvent("support-feedback", {
        detail: { helpful, pageId, categoryId },
      }),
    );
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ helpful, pageId, categoryId }),
      });
      if (!response.ok) throw new Error("feedback request failed");
      setAnswered(true);
    } catch {
      setError("送信できませんでした。時間をおいて、もう一度お試しください。");
    } finally {
      setSending(false);
    }
  };
  return (
    <section className="feedback-prompt" aria-label="案内へのフィードバック">
      {answered ? (
        <p role="status">回答ありがとうございました。</p>
      ) : (
        <>
          <p>この案内は役に立ちましたか？</p>
          <div>
            <button type="button" disabled={sending} onClick={() => answer(true)}>
              はい
            </button>
            <button type="button" disabled={sending} onClick={() => answer(false)}>
              いいえ
            </button>
          </div>
          <small>
            ページID・カテゴリ・回答だけを匿名で保存します。氏名や相談内容は送りません。
          </small>
          {error && <small role="alert">{error}</small>}
        </>
      )}
    </section>
  );
}
