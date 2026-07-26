import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { publishCandidate } from "@/crawler/publisher";
import {
  readAllResults,
  reviewCandidate,
  updateJob,
  type CandidateReviewUpdate,
} from "@/crawler/store";
import type { CandidateStatus, PublicationTarget, VerificationAction } from "@/crawler/types";
import { getPortalData } from "@/lib/data/repository";

const supportTypes = [
  "benefit", "loan", "reduction", "deferment", "goods", "housing",
  "consultation", "medical", "employment", "other",
] as const;

function value(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function optionalBoolean(formData: FormData, name: string): boolean | null {
  const raw = value(formData, name);
  if (raw === "true") return true;
  if (raw === "false") return false;
  return null;
}

function reviewUpdate(formData: FormData): CandidateReviewUpdate {
  const rawTarget = value(formData, "publicationTarget");
  const publicationTarget: PublicationTarget =
    rawTarget === "office" || rawTarget === "program" ? rawTarget : "";
  return {
    publicationTarget,
    categoryId: value(formData, "categoryId"),
    title: value(formData, "title"),
    plainTitle: value(formData, "plainTitle"),
    department: value(formData, "department"),
    description: value(formData, "description"),
    targetPeople: value(formData, "targetPeople"),
    supportType: value(formData, "supportType"),
    amountDescription: value(formData, "amountDescription"),
    repaymentRequired: optionalBoolean(formData, "repaymentRequired"),
    applicationDeadline: value(formData, "applicationDeadline"),
    requiredDocuments: value(formData, "requiredDocuments"),
    documentsOptionalNote: value(formData, "documentsOptionalNote"),
    applicationFlow: value(formData, "applicationFlow"),
    postalCode: value(formData, "postalCode"),
    address: value(formData, "address"),
    phone: value(formData, "phone"),
    fax: value(formData, "fax"),
    email: value(formData, "email"),
    contactFormUrl: value(formData, "contactFormUrl"),
    openingHours: value(formData, "openingHours"),
    closedDays: value(formData, "closedDays"),
    reservationRequired: optionalBoolean(formData, "reservationRequired"),
    availableMethods: value(formData, "availableMethods"),
    accessibility: value(formData, "accessibility"),
    languages: value(formData, "languages"),
    emergencyAlternative: value(formData, "emergencyAlternative"),
    officialUrl: value(formData, "officialUrl"),
    reviewNote: value(formData, "reviewNote"),
  };
}

async function reviewAction(formData: FormData) {
  "use server";
  const code = value(formData, "code");
  const id = value(formData, "id");
  const action = value(formData, "action");
  const actor = value(formData, "actor");
  let message = "";
  let errorMessage = "";
  try {
    if (action === "publish") {
      const result = await publishCandidate(code, id, actor);
      message = `CSVへ公開しました: ${result.preview.entityId}`;
    } else {
      const update = reviewUpdate(formData);
      if (["reject", "hold", "research"].includes(action) && !update.reviewNote) {
        throw new Error("却下・保留・再調査には理由を入力してください。");
      }
      const definitions: Record<string, { audit: VerificationAction; status: CandidateStatus }> = {
        save: { audit: "edit", status: "on_hold" },
        verify: { audit: "verify", status: "verified" },
        reject: { audit: "reject", status: "rejected" },
        hold: { audit: "hold", status: "on_hold" },
        research: { audit: "research", status: "on_hold" },
      };
      const definition = definitions[action];
      if (!definition) throw new Error("不正なレビュー操作です。");
      await reviewCandidate(code, id, update, definition.audit, actor, definition.status);
      if (action === "research") {
        const results = await readAllResults();
        const result = results.find((item) => item.municipalityCode === code);
        if (result) {
          await updateJob(result.municipalityId, {
            status: "pending",
            lastError: `人間レビューから再調査指定: ${update.reviewNote}`,
          });
        }
      }
      message = action === "verify" ? "確認済みにしました。公開操作はまだ行っていません。" : "レビュー内容を保存しました。";
    }
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error);
  }
  revalidatePath("/admin/review");
  const params = new URLSearchParams(errorMessage ? { error: errorMessage } : { message });
  redirect(`/admin/review?${params.toString()}`);
}

type ReviewPageProps = {
  searchParams: Promise<{ message?: string; error?: string }>;
};

export default async function ReviewPage({ searchParams }: ReviewPageProps) {
  const [results, portalData, params] = await Promise.all([
    readAllResults(),
    getPortalData(),
    searchParams,
  ]);
  const candidates = results.flatMap((result) =>
    result.candidates.map((candidate) => ({
      ...candidate,
      municipalityName: result.municipalityName,
      code: result.municipalityCode,
    })),
  ).sort((left, right) => {
    const order: Record<CandidateStatus, number> = {
      review_required: 0,
      on_hold: 1,
      verified: 2,
      rejected: 3,
      published: 4,
    };
    return order[left.status] - order[right.status] || right.confidence - left.confidence;
  });

  return (
    <main id="main" className="page-shell admin-shell">
      <p className="eyebrow">管理確認用</p>
      <h1>クロール結果レビュー</h1>
      <p>
        {candidates.length}件の候補。確認済みへの変更とCSV公開は別操作です。
        公式ページの原文と入力内容を照合してから確認済みにしてください。
      </p>
      {params.message ? <p className="admin-message" role="status">{params.message}</p> : null}
      {params.error ? <p className="admin-error" role="alert">{params.error}</p> : null}
      <div className="review-list">
        {candidates.map((item) => {
          const immutable = item.status === "published";
          return (
            <article className="result-card" key={`${item.code}-${item.id}`}>
              <p className="eyebrow">
                {item.municipalityName} / 信頼度 {Math.round(item.confidence * 100)}% / {item.status}
              </p>
              <h2>{item.title || "名称未抽出"}</h2>
              <dl>
                <dt>出典</dt>
                <dd><a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.sourceUrl}</a></dd>
                <dt>取得日時</dt><dd>{item.extractedAt}</dd>
                <dt>確認者</dt><dd>{item.reviewer || "未確認"}</dd>
                <dt>確認日時</dt><dd>{item.reviewedAt || "未確認"}</dd>
                <dt>警告</dt><dd>{item.warnings.join(" / ") || "なし"}</dd>
                {item.publishedEntityId ? <><dt>公開ID</dt><dd>{item.publishedEntityId}</dd></> : null}
              </dl>
              <details>
                <summary>取得原文を確認</summary>
                <pre className="original-text">{item.originalText}</pre>
              </details>
              <form action={reviewAction} className="review-editor">
                <input type="hidden" name="code" value={item.code} />
                <input type="hidden" name="id" value={item.id} />
                <fieldset disabled={immutable}>
                  <legend>公開データ候補</legend>
                  <div className="review-field-grid">
                    <label>公開先
                      <select name="publicationTarget" defaultValue={item.publicationTarget}>
                        <option value="">選択してください</option>
                        <option value="office">相談窓口</option>
                        <option value="program">支援制度</option>
                      </select>
                    </label>
                    <label>困りごとの分類
                      <select name="categoryId" defaultValue={item.categoryId}>
                        <option value="">選択してください</option>
                        {portalData.categories.map((category) =>
                          <option key={category.id} value={category.id}>{category.label}</option>)}
                      </select>
                    </label>
                    <label>公式名称
                      <input name="title" defaultValue={item.title} required />
                    </label>
                    <label>分かりやすい名称
                      <input name="plainTitle" defaultValue={item.plainTitle} />
                    </label>
                    <label>担当部署
                      <input name="department" defaultValue={item.department} />
                    </label>
                    <label>郵便番号
                      <input name="postalCode" defaultValue={item.postalCode} inputMode="numeric" />
                    </label>
                    <label className="review-wide">説明
                      <textarea name="description" defaultValue={item.description} rows={4} required />
                    </label>
                    <label>住所
                      <input name="address" defaultValue={item.address} />
                    </label>
                    <label>電話番号
                      <input name="phone" defaultValue={item.phone} inputMode="tel" />
                    </label>
                    <label>FAX
                      <input name="fax" defaultValue={item.fax} inputMode="tel" />
                    </label>
                    <label>メール
                      <input name="email" defaultValue={item.email} type="email" />
                    </label>
                    <label>問い合わせフォームURL
                      <input name="contactFormUrl" defaultValue={item.contactFormUrl} type="url" />
                    </label>
                    <label>公式URL
                      <input name="officialUrl" defaultValue={item.officialUrl} type="url" />
                    </label>
                    <label>受付時間
                      <input name="openingHours" defaultValue={item.openingHours} />
                    </label>
                    <label>休業日
                      <input name="closedDays" defaultValue={item.closedDays} />
                    </label>
                    <label>予約
                      <select name="reservationRequired" defaultValue={item.reservationRequired === null ? "" : String(item.reservationRequired)}>
                        <option value="">未確認</option>
                        <option value="false">不要</option>
                        <option value="true">必要</option>
                      </select>
                    </label>
                    <label>対応方法
                      <input name="availableMethods" defaultValue={item.availableMethods} />
                    </label>
                    <label>アクセシビリティ
                      <input name="accessibility" defaultValue={item.accessibility} />
                    </label>
                    <label>対応言語
                      <input name="languages" defaultValue={item.languages} />
                    </label>
                    <label className="review-wide">緊急時の代替窓口
                      <input name="emergencyAlternative" defaultValue={item.emergencyAlternative} />
                    </label>
                  </div>
                  <details className="program-review-fields">
                    <summary>制度として公開する場合の項目</summary>
                    <div className="review-field-grid">
                      <label>対象者
                        <input name="targetPeople" defaultValue={item.targetPeople} />
                      </label>
                      <label>支援種別
                        <select name="supportType" defaultValue={item.supportType}>
                          <option value="">選択してください</option>
                          {supportTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                        </select>
                      </label>
                      <label>返済の要否
                        <select name="repaymentRequired" defaultValue={item.repaymentRequired === null ? "" : String(item.repaymentRequired)}>
                          <option value="">未確認</option>
                          <option value="false">返済不要</option>
                          <option value="true">返済必要</option>
                        </select>
                      </label>
                      <label>金額・支援内容
                        <input name="amountDescription" defaultValue={item.amountDescription} />
                      </label>
                      <label>申請期限
                        <input name="applicationDeadline" defaultValue={item.applicationDeadline} />
                      </label>
                      <label>必要書類
                        <input name="requiredDocuments" defaultValue={item.requiredDocuments} />
                      </label>
                      <label className="review-wide">書類が不足する場合の案内
                        <input name="documentsOptionalNote" defaultValue={item.documentsOptionalNote} />
                      </label>
                      <label className="review-wide">申請の流れ
                        <textarea name="applicationFlow" defaultValue={item.applicationFlow} rows={3} />
                      </label>
                    </div>
                  </details>
                  <label className="review-note">確認者名
                    <input name="actor" defaultValue={item.reviewer} required />
                  </label>
                  <label className="review-note">確認メモ
                    <textarea name="reviewNote" defaultValue={item.reviewNote} rows={3} />
                  </label>
                  <div className="review-actions">
                    <button name="action" value="save">編集内容を保存</button>
                    <button name="action" value="verify">確認済みにする</button>
                    <button name="action" value="reject">却下</button>
                    <button name="action" value="hold">保留</button>
                    <button name="action" value="research">再調査</button>
                  </div>
                </fieldset>
              </form>
              {item.status === "verified" ? (
                <form action={reviewAction} className="publish-candidate">
                  <input type="hidden" name="code" value={item.code} />
                  <input type="hidden" name="id" value={item.id} />
                  <label>公開担当者名
                    <input name="actor" defaultValue={item.reviewer} required />
                  </label>
                  <p>この操作はCSVへ追記し、一般画面へ公開します。公開前に上の内容を再確認してください。</p>
                  <button name="action" value="publish">CSVへ公開する</button>
                </form>
              ) : null}
            </article>
          );
        })}
      </div>
    </main>
  );
}
