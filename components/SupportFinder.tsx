"use client";

import { useMemo, useState } from "react";
import type { FinderViewModel } from "@/lib/data/view-models";

function displayDate(value: string): string {
  if (!value) return "未確認";
  const [year, month, day] = value.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function telephoneHref(value: string): string {
  return `tel:${value.replace(/[^\d+]/g, "")}`;
}

export default function SupportFinder({ data }: { data: FinderViewModel }) {
  const [categoryId, setCategoryId] = useState("");
  const [prefectureCode, setPrefectureCode] = useState("");
  const [municipalityId, setMunicipalityId] = useState("");
  const [searched, setSearched] = useState(false);

  const municipalityOptions = useMemo(
    () => data.municipalities.filter((item) => item.prefectureCode === prefectureCode),
    [data.municipalities, prefectureCode],
  );
  const municipality = data.municipalities.find((item) => item.id === municipalityId);
  const results = useMemo(() => {
    const available = data.programs.filter((item) =>
      item.scope === "national" || Boolean(municipalityId && item.municipalityId === municipalityId),
    );
    const direct = available.filter((item) => item.categoryId === categoryId);
    return direct.length ? direct : available.filter((item) => ["public-assistance", "self-reliance"].includes(item.id));
  }, [categoryId, municipalityId, data.programs]);
  const offices = useMemo(() => {
    if (!municipalityId) return [];
    const direct = data.offices.filter((item) =>
      item.municipalityId === municipalityId && item.categoryId === categoryId,
    );
    return direct.length ? direct : data.offices.filter((item) =>
      item.municipalityId === municipalityId && item.categoryId === "unknown",
    );
  }, [categoryId, municipalityId, data.offices]);
  const canSearch = Boolean(categoryId);

  return (
    <section className="finder" aria-labelledby="finder-title">
      <h2 id="finder-title">あなたの状況を教えてください</h2>
      <p className="finder-help">
        制度名を知っている必要はありません。いまの状況に近いものを1つ選んでください。
        地域は分かる範囲で選べます。
      </p>
      <fieldset>
        <legend>1. いま、一番困っていること</legend>
        <div className="need-grid">
          {data.categories.map((category) => (
            <label key={category.id} className={`need-card ${categoryId === category.id ? "is-selected" : ""}`}>
              <input type="radio" name="need" value={category.id} checked={categoryId === category.id}
                onChange={() => { setCategoryId(category.id); setSearched(false); }} />
              <strong>{category.label}</strong>
              <span>{category.description}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="location-grid">
        <label><span>2. 都道府県（あとでも選べます）</span>
          <select value={prefectureCode} onChange={(event) => {
            setPrefectureCode(event.target.value); setMunicipalityId(""); setSearched(false);
          }}>
            <option value="">選択してください</option>
            {data.prefectures.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
          </select>
        </label>
        <label><span>3. 市区町村（あとでも選べます）</span>
          <select value={municipalityId} disabled={!prefectureCode} onChange={(event) => {
            setMunicipalityId(event.target.value); setSearched(false);
          }}>
            <option value="">{municipalityOptions.length ? "選択してください" : "公開済み自治体はありません"}</option>
            {municipalityOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
      </div>

      {prefectureCode && !municipalityOptions.length && (
        <p className="preparing-message">
          この都道府県の自治体別情報は現在整備中です。全国共通の支援情報は確認できます。
        </p>
      )}

      <button className="primary-button" disabled={!canSearch} onClick={() => setSearched(true)}>
        {municipality ? `${municipality.name}の相談先を見る` : "全国共通の支援を先に見る"}
      </button>

      {searched && (
        <div className="results" aria-live="polite">
          <div className="results-head">
            <p className="eyebrow">{municipality?.name ?? "全国共通"}</p>
            <h2>今日できること</h2>
            {!municipality && (
              <p className="preparing-message">
                全国共通の制度を表示しています。自治体を選ぶと、登録済みの地域窓口も表示します。
              </p>
            )}
            {municipality?.supportLevel === "basic" && (
              <p className="preparing-message">
                この自治体の詳細な支援情報は現在整備中です。<br />
                全国共通の相談先と自治体公式サイトをご案内します。
              </p>
            )}
            {municipality?.officialUrl && <a href={municipality.officialUrl} target="_blank" rel="noreferrer">自治体公式サイトを開く</a>}
          </div>
          {offices.length > 0 && (
            <section className="office-results" aria-labelledby="office-results-title">
              <h3 id="office-results-title">電話や来所で相談できる窓口</h3>
              {offices.map((office) => (
                <article key={office.id} className="office-card">
                  <p className="step-label">地域の窓口</p>
                  <h4>{office.plainName || office.name}</h4>
                  {office.description && <p>{office.description}</p>}
                  {office.phone && (
                    <a className="phone-button" href={telephoneHref(office.phone)}>
                      <span>電話する</span>
                      <strong>{office.phone}</strong>
                    </a>
                  )}
                  <dl className="office-details">
                    {office.openingHours && <><dt>受付時間</dt><dd>{office.openingHours}</dd></>}
                    {office.closedDays && <><dt>休み</dt><dd>{office.closedDays}</dd></>}
                    {office.address && <><dt>場所</dt><dd>{office.address}</dd></>}
                  </dl>
                  <footer className="source-row">
                    {office.sourceUrl
                      ? <a href={office.sourceUrl} target="_blank" rel="noreferrer">{office.sourceTitle || "公式情報"}</a>
                      : office.officialUrl
                        ? <a href={office.officialUrl} target="_blank" rel="noreferrer">窓口の公式ページ</a>
                        : <span>出典ページなし</span>}
                    <span>情報確認日：{displayDate(office.lastVerifiedAt)}</span>
                  </footer>
                </article>
              ))}
            </section>
          )}
          {results.map((result, index) => (
            <article key={result.id} className="result-card">
              <p className="step-label">優先 {index + 1}</p>
              <h3>{result.plainName || result.name}</h3>
              <p>{result.description}</p>
              <div className="result-block"><h4>まずすること</h4><p>{result.applicationFlow}</p></div>
              {result.requiredDocuments.length > 0 && (
                <div className="result-block">
                  <h4>手元にあれば用意するもの</h4>
                  <ul>{result.requiredDocuments.map((document) => <li key={document}>{document}</li>)}</ul>
                  {result.documentsOptionalNote && <p className="note">{result.documentsOptionalNote}</p>}
                </div>
              )}
              <footer className="source-row">
                <a href={result.sourceUrl} target="_blank" rel="noreferrer">{result.sourceTitle}</a>
                <span>情報確認日：{displayDate(result.lastVerifiedAt)}</span>
              </footer>
            </article>
          ))}
          {!results.length && (
            <p className="no-results">この状況に対応する公開済み情報は、まだ登録されていません。</p>
          )}
        </div>
      )}
    </section>
  );
}
