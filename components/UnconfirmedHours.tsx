"use client";

import { useEffect, useState } from "react";

function likelyOpenNow(): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const minutes = Number(value.hour) * 60 + Number(value.minute);
  return (
    !["Sat", "Sun"].includes(value.weekday) && minutes >= 8 * 60 + 30 && minutes < 17 * 60 + 15
  );
}

export default function UnconfirmedHours() {
  const [availability, setAvailability] = useState<"unknown" | "high" | "low">("unknown");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAvailability(likelyOpenNow() ? "high" : "low");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <>
      受付時間は未確認です。役所関係の窓口は平日8時30分〜17時15分の場合が多いため、
      {availability === "unknown"
        ? "現在の受付状況は公式ページで確認してください。"
        : `いまは開いている可能性が${availability === "high" ? "高い" : "低い"}です。`}
    </>
  );
}
