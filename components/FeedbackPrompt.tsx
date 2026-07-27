"use client";

import { useState } from "react";

export default function FeedbackPrompt({ context }: { context: string }) {
  const [answered, setAnswered] = useState(false);
  const answer = (helpful: boolean) => {
    window.dispatchEvent(
      new CustomEvent("support-feedback", {
        detail: { helpful, context },
      }),
    );
    setAnswered(true);
  };
  return (
    <section className="feedback-prompt" aria-label="案内へのフィードバック">
      {answered ? (
        <p role="status">回答ありがとうございました。</p>
      ) : (
        <>
          <p>この案内は役に立ちましたか？</p>
          <div>
            <button type="button" onClick={() => answer(true)}>
              はい
            </button>
            <button type="button" onClick={() => answer(false)}>
              いいえ
            </button>
          </div>
          <small>氏名や相談内容は入力しません。</small>
        </>
      )}
    </section>
  );
}
