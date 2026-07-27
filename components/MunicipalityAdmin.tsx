"use client";

import { useMemo, useState } from "react";
import type { AdminMunicipality } from "@/lib/data/view-models";

const levelLabels = { basic: "基本", standard: "標準", detailed: "詳細" };

export default function MunicipalityAdmin({
  municipalities,
}: {
  municipalities: AdminMunicipality[];
}) {
  const [prefecture, setPrefecture] = useState("");
  const [status, setStatus] = useState("");
  const [level, setLevel] = useState("");
  const [missingOnly, setMissingOnly] = useState(false);
  const [expiredOnly, setExpiredOnly] = useState(false);
  const prefectures = [...new Set(municipalities.map((item) => item.prefectureName))];
  const statuses = [...new Set(municipalities.map((item) => item.status))];
  const filtered = useMemo(
    () =>
      municipalities.filter(
        (item) =>
          (!prefecture || item.prefectureName === prefecture) &&
          (!status || item.status === status) &&
          (!level || item.supportLevel === level) &&
          (!missingOnly || item.missingCount > 0) &&
          (!expiredOnly || item.verificationExpired),
      ),
    [municipalities, prefecture, status, level, missingOnly, expiredOnly],
  );

  return (
    <section className="admin-panel">
      <div className="admin-filters" aria-label="絞り込み">
        <label>
          都道府県
          <select value={prefecture} onChange={(e) => setPrefecture(e.target.value)}>
            <option value="">すべて</option>
            {prefectures.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          ステータス
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">すべて</option>
            {statuses.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          対応レベル
          <select value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="">すべて</option>
            <option value="basic">基本</option>
            <option value="standard">標準</option>
            <option value="detailed">詳細</option>
          </select>
        </label>
        <label className="check-filter">
          <input
            type="checkbox"
            checked={missingOnly}
            onChange={(e) => setMissingOnly(e.target.checked)}
          />
          情報不足あり
        </label>
        <label className="check-filter">
          <input
            type="checkbox"
            checked={expiredOnly}
            onChange={(e) => setExpiredOnly(e.target.checked)}
          />
          最終確認期限切れ
        </label>
      </div>
      <p className="table-summary">{filtered.length}件を表示</p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>都道府県</th>
              <th>自治体名</th>
              <th>対応</th>
              <th>ステータス</th>
              <th>窓口</th>
              <th>制度</th>
              <th>最終確認日</th>
              <th>情報不足</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id}>
                <td>{item.prefectureName}</td>
                <th scope="row">{item.name}</th>
                <td>{levelLabels[item.supportLevel]}</td>
                <td>
                  <span className={`status status-${item.status}`}>{item.status}</span>
                </td>
                <td>{item.officeCount}</td>
                <td>{item.programCount}</td>
                <td className={item.verificationExpired ? "is-expired" : ""}>
                  {item.lastVerifiedAt || "未確認"}
                </td>
                <td>
                  {item.missingCount > 0 ? (
                    <strong className="missing-count">{item.missingCount}件</strong>
                  ) : (
                    "なし"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
