"use client";

import { useEffect, useMemo, useState } from "react";
import AfterHoursGuide from "@/components/AfterHoursGuide";
import FeedbackPrompt from "@/components/FeedbackPrompt";
import type { FinderOffice, FinderProgram, FinderViewModel } from "@/lib/data/view-models";

function displayDate(value: string): string {
  if (!value) return "未確認";
  const [year, month, day] = value.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function telephoneHref(value: string): string {
  return `tel:${value.replace(/[^\d+]/g, "")}`;
}

function verificationExpired(value: string): boolean {
  if (!value) return true;
  return Date.now() - new Date(`${value}T00:00:00Z`).getTime() > 180 * 86_400_000;
}

const RELATED_CATEGORIES: Record<string, string[]> = {
  food: ["money", "housing", "work"],
  housing: ["money", "rent", "violence"],
  rent: ["money", "work", "debt"],
  utilities: ["money", "debt", "food"],
  money: ["food", "rent", "work"],
  medical: ["money", "disability", "mental"],
  work: ["money", "rent", "mental"],
  debt: ["money", "rent", "mental"],
  violence: ["housing", "children", "mental"],
  children: ["money", "housing", "work"],
  mental: ["money", "work", "medical"],
  disability: ["medical", "money", "care"],
  care: ["money", "work", "medical"],
  unknown: ["food", "housing", "money"],
};

export default function SupportFinder({ data }: { data: FinderViewModel }) {
  const [categoryId, setCategoryId] = useState("");
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [prefectureCode, setPrefectureCode] = useState("");
  const [municipalityId, setMunicipalityId] = useState("");
  const [searched, setSearched] = useState(false);
  const [urlReady, setUrlReady] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const [results, setResults] = useState<FinderProgram[]>([]);
  const [offices, setOffices] = useState<FinderOffice[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const need = query.get("need") ?? "";
    const municipalityQuery = query.get("municipality") ?? "";
    const validCategory = data.categories.some((item) => item.id === need) ? need : "";
    const validMunicipality = data.municipalities.find((item) => item.id === municipalityQuery);
    const timer = window.setTimeout(() => {
      setCategoryId(validCategory);
      setMunicipalityId(validMunicipality?.id ?? "");
      setPrefectureCode(validMunicipality?.prefectureCode ?? "");
      setSearched(Boolean(validCategory));
      setSearching(Boolean(validCategory));
      setActiveStep(validCategory ? 3 : 1);
      setUrlReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [data.categories, data.municipalities]);

  useEffect(() => {
    if (!searched || !categoryId) return;
    const controller = new AbortController();
    const query = new URLSearchParams({ need: categoryId });
    if (municipalityId) query.set("municipality", municipalityId);
    fetch(`/api/support?${query}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("相談先を読み込めませんでした。");
        return response.json() as Promise<{ programs: FinderProgram[]; offices: FinderOffice[] }>;
      })
      .then((response) => {
        setResults(response.programs);
        setOffices(response.offices);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSearchError("相談先を読み込めませんでした。少し待ってから、もう一度お試しください。");
      })
      .finally(() => setSearching(false));
    return () => controller.abort();
  }, [categoryId, municipalityId, searched]);

  useEffect(() => {
    if (!urlReady) return;
    const query = new URLSearchParams();
    if (categoryId) query.set("need", categoryId);
    if (municipalityId) query.set("municipality", municipalityId);
    const nextUrl = `${window.location.pathname}${query.size ? `?${query}` : ""}${searched ? "#support-results" : ""}`;
    window.history.replaceState(null, "", nextUrl);
  }, [categoryId, municipalityId, searched, urlReady]);

  const municipalityOptions = useMemo(
    () => data.municipalities.filter((item) => item.prefectureCode === prefectureCode),
    [data.municipalities, prefectureCode],
  );
  const municipality = data.municipalities.find((item) => item.id === municipalityId);
  const canSearch = Boolean(categoryId);
  const selectedCategory = data.categories.find((item) => item.id === categoryId);
  const showResults = () => {
    setSearching(true);
    setSearchError("");
    setSearched(true);
    setActiveStep(3);
  };
  const moveToCategory = (nextCategoryId: string) => {
    setCategoryId(nextCategoryId);
    setSearching(true);
    setSearchError("");
    setSearched(true);
    setActiveStep(3);
  };
  const shareResults = async () => {
    const shareData = {
      title: `${municipality?.name ?? "全国共通"}の「${selectedCategory?.label ?? "生活の困りごと"}」相談先`,
      text: "くらし支援ナビの相談先案内",
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareStatus("共有画面を開きました。");
      } else {
        await navigator.clipboard.writeText(shareData.url);
        setShareStatus("この案内のURLをコピーしました。");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareStatus("共有できませんでした。ブラウザのアドレスをコピーしてください。");
    }
  };

  return (
    <section id="support-finder" className="finder" aria-labelledby="finder-title">
      <div className="finder-heading">
        <p className="section-kicker">相談先を探す</p>
        <h2 id="finder-title">いまの状況に近いものを選んでください</h2>
        <p className="finder-help">
          制度名は分からなくて大丈夫です。入力内容が送信・保存されることはありません。
        </p>
        {verificationExpired(data.latestVerifiedAt) && (
          <p className="stale-data-warning" role="alert">
            掲載情報の最終更新から180日以上経過しています。連絡前に必ず公式サイトで最新情報を確認してください。
          </p>
        )}
      </div>

      <div className="finder-progress" aria-label="検索の流れ">
        <span className={activeStep > 1 ? "is-complete" : "is-current"}>
          <b>1</b>困りごと
        </span>
        <span className={activeStep > 2 ? "is-complete" : activeStep === 2 ? "is-current" : ""}>
          <b>2</b>地域
        </span>
        <span className={activeStep === 3 ? "is-current" : ""}>
          <b>3</b>案内を見る
        </span>
      </div>

      {activeStep === 1 && (
        <fieldset className="need-fieldset">
          <legend className="visually-hidden">いま、一番困っていること</legend>
          <div className="step-heading" aria-hidden="true">
            <span className="step-number">1</span>
            <span>いま、一番困っていること</span>
          </div>
          <p className="field-help">
            完全に同じでなくても、いちばん近いものを1つ選べば大丈夫です。
          </p>
          <div className="need-grid">
            {data.categories.map((category) => (
              <label
                key={category.id}
                className={`need-card ${categoryId === category.id ? "is-selected" : ""}`}
              >
                <input
                  type="radio"
                  name="need"
                  value={category.id}
                  checked={categoryId === category.id}
                  onChange={() => {
                    setCategoryId(category.id);
                    setSearched(false);
                    setActiveStep(2);
                  }}
                />
                <span className="need-radio" aria-hidden="true" />
                <span className="need-copy">
                  <strong>{category.label}</strong>
                  <small>{category.description}</small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {activeStep === 2 && categoryId === "unknown" && (
        <aside className="urgent-check">
          <h3>まず、今日・明日の生活は大丈夫ですか？</h3>
          <p>近いものがあれば、ここから選び直せます。</p>
          <div>
            <button type="button" onClick={() => setCategoryId("food")}>
              食べるものがない
            </button>
            <button type="button" onClick={() => setCategoryId("housing")}>
              寝る場所がない
            </button>
            <button type="button" onClick={() => setCategoryId("money")}>
              生活費がない
            </button>
          </div>
          <small>
            どれにも当てはまらなければ、「何を選べばよいか分からない」のままで大丈夫です。
          </small>
        </aside>
      )}

      {activeStep === 2 && (
        <fieldset className="location-fieldset">
          <legend className="visually-hidden">住んでいる地域</legend>
          <div className="step-heading" aria-hidden="true">
            <span className="step-number">2</span>
            <span>住んでいる地域</span>
          </div>
          <p className="field-help">
            地域を選ばなくても、全国共通の支援を確認できます。 郵便番号や詳しい住所は入力しません。
          </p>
          <div className="location-grid">
            <label>
              <span>
                都道府県 <em>任意</em>
              </span>
              <select
                value={prefectureCode}
                onChange={(event) => {
                  setPrefectureCode(event.target.value);
                  setMunicipalityId("");
                  setSearched(false);
                }}
              >
                <option value="">選択しない</option>
                {data.prefectures.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>
                市区町村 <em>任意</em>
              </span>
              <select
                value={municipalityId}
                disabled={!prefectureCode}
                onChange={(event) => {
                  setMunicipalityId(event.target.value);
                  setSearched(false);
                }}
              >
                <option value="">
                  {prefectureCode
                    ? municipalityOptions.length
                      ? "選択しない"
                      : "公開済み自治体はありません"
                    : "先に都道府県を選択"}
                </option>
                {municipalityOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {prefectureCode && !municipalityOptions.length && (
            <p className="preparing-message">
              この都道府県の自治体別情報は現在整備中です。全国共通の支援情報は確認できます。
            </p>
          )}
        </fieldset>
      )}

      {activeStep === 2 && (
        <div className="search-action">
          {selectedCategory ? (
            <p>
              <strong>選んだ状況：</strong>
              {selectedCategory.label}
              <button type="button" className="text-button" onClick={() => setActiveStep(1)}>
                選び直す
              </button>
            </p>
          ) : (
            <p>最初に困りごとを1つ選んでください</p>
          )}
          <button className="primary-button" disabled={!canSearch} onClick={showResults}>
            {searching
              ? "読み込み中…"
              : municipality
                ? `${municipality.name}の相談先を見る`
                : "相談先と支援を見る"}
          </button>
        </div>
      )}

      {activeStep === 3 && searched && (
        <div id="support-results" className="results" aria-live="polite">
          <button
            type="button"
            className="step-back-button"
            onClick={() => {
              setActiveStep(2);
              setSearched(false);
            }}
          >
            ← 地域を選び直す
          </button>
          {searching && <p role="status">相談先を読み込んでいます…</p>}
          {searchError && (
            <p className="stale-data-warning" role="alert">
              {searchError}
            </p>
          )}
          <div className="results-head">
            <p className="section-kicker">{municipality?.name ?? "全国共通"}の案内</p>
            <h2>まず、ここから相談できます</h2>
            <p>
              「{selectedCategory?.label}」について、
              {offices.length + results.length}件の公開情報があります。
            </p>
            {!municipality && (
              <p className="preparing-message">
                全国共通の制度を表示しています。自治体を選ぶと、登録済みの地域窓口も表示します。
              </p>
            )}
            {municipality?.supportLevel === "basic" && (
              <p className="preparing-message">
                この自治体の詳細な支援情報は現在整備中です。
                <br />
                全国共通の相談先と自治体公式サイトをご案内します。
              </p>
            )}
            {municipality?.officialUrl && (
              <a
                className="official-link"
                href={municipality.officialUrl}
                target="_blank"
                rel="noreferrer"
              >
                {municipality.name}公式サイトを開く
              </a>
            )}
            <div className="result-actions">
              <button type="button" className="secondary-button" onClick={shareResults}>
                この案内を共有
              </button>
              {shareStatus && <span role="status">{shareStatus}</span>}
            </div>
          </div>
          <AfterHoursGuide categoryId={categoryId} />
          {(categoryId === "food" || categoryId === "housing") && (
            <aside className="expectation-bridge">
              <h3>
                {categoryId === "food"
                  ? "食べ物につながるための相談窓口です"
                  : "泊まる場所につながるための相談窓口です"}
              </h3>
              <p>
                {categoryId === "food"
                  ? "下の窓口へ電話すると、利用できる食料支援、フードバンク、緊急の食料提供などを一緒に探してもらえます。"
                  : "下の窓口へ電話すると、一時的な宿泊や住まいの支援を利用できるか一緒に確認してもらえます。"}
                支援を必ず受けられるという意味ではありませんが、入口になる窓口です。
              </p>
              <p>
                最初に「
                {categoryId === "food"
                  ? "今日食べるものがなくて困っています"
                  : "今夜泊まる場所がなくて困っています"}
                」と伝えてください。
              </p>
            </aside>
          )}
          {categoryId === "utilities" && (
            <aside className="utility-guidance">
              <h3>電気・ガスと水道では、連絡先が違います</h3>
              <p>
                <strong>電気・ガス：</strong>請求書や検針票に書かれた会社へ電話し、
                「支払いを待ってもらえないか相談したいです」と伝えてください。
              </p>
              <p>
                <strong>水道：</strong>
                自治体や水道局の料金担当へ相談します。下の窓口から担当につないでもらえます。
              </p>
            </aside>
          )}
          {categoryId === "violence" && !searching && offices.length === 0 && (
            <p className="danger-guidance">
              安全のため、自治体の代表電話は表示していません。ページ上部のDV相談＋の
              電話・チャット・メールを利用してください。
            </p>
          )}
          {offices.length > 0 && (
            <section className="office-results" aria-labelledby="office-results-title">
              <h3 id="office-results-title">電話や来所で相談できる窓口</h3>
              {offices.map((office) => (
                <article key={office.id} className="office-card">
                  <p className={`contact-rank ${office.contactType}`}>
                    {office.contactType === "representative"
                      ? "代表電話・担当への取り次ぎが必要"
                      : office.contactType === "self-reliance"
                        ? "総合相談の直通・このまま話せます"
                        : "専用窓口の直通・このまま話せます"}
                  </p>
                  <h4>{office.plainName || office.name}</h4>
                  {office.description && <p>{office.description}</p>}
                  {office.phone && (
                    <a className="phone-button" href={telephoneHref(office.phone)}>
                      <span>電話する</span>
                      <strong>{office.phone}</strong>
                    </a>
                  )}
                  {office.contactType === "representative" ? (
                    <div className="transfer-script">
                      <h5>まず受付の人に</h5>
                      <p>「{office.transferTarget}につないでください」</p>
                      <small>事情は、まだ話さなくて大丈夫です。</small>
                      <h5>「どのような用件ですか」と聞かれたら</h5>
                      <p>「生活のことで相談したいです」</p>
                      <h5>担当につながったら</h5>
                      <p>
                        「{selectedCategory?.label}
                        ことで困っています。使える制度や相談先を教えてください」
                      </p>
                    </div>
                  ) : (
                    <div className="direct-script">
                      <h5>電話で、こう伝えて大丈夫です</h5>
                      <p>
                        「{selectedCategory?.label}
                        ことで困っています。使える制度や相談先を教えてください」
                      </p>
                    </div>
                  )}
                  <dl className="office-details">
                    <dt>受付時間</dt>
                    <dd>
                      {office.openingHours ||
                        "未確認です。役所関係の窓口は平日の日中だけの場合が多いため、公式ページで確認してください。"}
                    </dd>
                    {office.closedDays && (
                      <>
                        <dt>休み</dt>
                        <dd>{office.closedDays}</dd>
                      </>
                    )}
                    {office.address && (
                      <>
                        <dt>場所</dt>
                        <dd>{office.address}</dd>
                      </>
                    )}
                    {office.serviceArea && (
                      <>
                        <dt>管轄地域</dt>
                        <dd>{office.serviceArea}</dd>
                      </>
                    )}
                    {office.eligibilityConditions && (
                      <>
                        <dt>対象条件</dt>
                        <dd>{office.eligibilityConditions}</dd>
                      </>
                    )}
                  </dl>
                  <footer className="source-row">
                    {office.sourceUrl ? (
                      <a href={office.sourceUrl} target="_blank" rel="noreferrer">
                        {office.sourceTitle || "公式情報"}
                      </a>
                    ) : office.officialUrl ? (
                      <a href={office.officialUrl} target="_blank" rel="noreferrer">
                        窓口の公式ページ
                      </a>
                    ) : (
                      <span>出典ページなし</span>
                    )}
                    <span>情報確認日：{displayDate(office.lastVerifiedAt)}</span>
                  </footer>
                </article>
              ))}
            </section>
          )}
          {offices.length > 0 && (
            <aside className="connection-fallback">
              <h3>電話がつながらないとき</h3>
              <ol>
                <li>受付時間を確認し、時間内に少し間をあけてかけ直す</li>
                {offices.some((office) => office.availableMethods.includes("来所")) && (
                  <li>安全に移動できる場合は、受付時間を確認して窓口へ直接行く</li>
                )}
                {categoryId !== "violence" && (
                  <li>急ぐ場合は「代表電話・取り次ぎが必要」の番号へかけ、担当につないでもらう</li>
                )}
              </ol>
              <p>つながらなかったことは、あなたの責任ではありません。</p>
            </aside>
          )}
          {offices.some((office) => office.contactType === "representative") && (
            <aside className="transfer-tips">
              <h3>電話を何度も回されないために</h3>
              <ol>
                <li>つないでもらう前に「切れたときのために、直通番号を教えてください」</li>
                <li>違う担当につながったら「どこにかければよいですか。番号も教えてください」</li>
                <li>
                  3回回されたら、電話を切って大丈夫です。上にある「総合相談の直通」へかけ直してください。
                </li>
              </ol>
              <p>間違った担当につながっても、謝る必要はありません。</p>
            </aside>
          )}
          {results.map((result, index) => (
            <article key={result.id} className="result-card">
              <p className="step-label">優先 {index + 1}</p>
              <h3>{result.plainName || result.name}</h3>
              <p>{result.description}</p>
              <div className="result-block">
                <h4>まずすること</h4>
                <p>{result.applicationFlow}</p>
              </div>
              {result.requiredDocuments.length > 0 && (
                <div className="result-block">
                  <h4>手元にあれば用意するもの</h4>
                  <ul>
                    {result.requiredDocuments.map((document) => (
                      <li key={document}>{document}</li>
                    ))}
                  </ul>
                  {result.documentsOptionalNote && (
                    <p className="note">{result.documentsOptionalNote}</p>
                  )}
                </div>
              )}
              <footer className="source-row">
                <a href={result.sourceUrl} target="_blank" rel="noreferrer">
                  {result.sourceTitle}
                </a>
                <span>情報確認日：{displayDate(result.lastVerifiedAt)}</span>
              </footer>
            </article>
          ))}
          {!results.length && (
            <p className="no-results">この状況に対応する公開済み情報は、まだ登録されていません。</p>
          )}
          <nav className="related-needs" aria-label="関連する困りごと">
            <h3>ほかにも、こんな状況ではありませんか？</h3>
            <p>困りごとは1つでなくて大丈夫です。続けて別の案内も確認できます。</p>
            <div>
              {(RELATED_CATEGORIES[categoryId] ?? RELATED_CATEGORIES.unknown).map((relatedId) => {
                const related = data.categories.find((item) => item.id === relatedId);
                return (
                  related && (
                    <button type="button" key={relatedId} onClick={() => moveToCategory(relatedId)}>
                      {related.label}
                    </button>
                  )
                );
              })}
            </div>
          </nav>
          <FeedbackPrompt context={`${municipalityId || "national"}:${categoryId}`} />
        </div>
      )}
    </section>
  );
}
