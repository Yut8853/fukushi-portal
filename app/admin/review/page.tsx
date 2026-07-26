import { revalidatePath } from "next/cache";
import { readAllResults, updateCandidate, updateJob } from "@/crawler/store";

async function reviewAction(formData: FormData) {
  "use server";
  const code = String(formData.get("code") ?? "");
  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "");
  if (action === "approve" || action === "approve-edited") await updateCandidate(code, id, "verified");
  else if (action === "reject") await updateCandidate(code, id, "rejected");
  else if (action === "hold") await updateCandidate(code, id, "on_hold");
  else if (action === "research") {
    await updateCandidate(code, id, "on_hold");
    const results = await readAllResults();
    const result = results.find((item) => item.municipalityCode === code);
    if (result) await updateJob(result.municipalityId, { status: "pending", lastError: "人間レビューから再調査指定" });
  }
  revalidatePath("/admin/review");
}

export default async function ReviewPage() {
  const candidates = (await readAllResults()).flatMap((result) =>
    result.candidates.map((candidate) => ({ ...candidate, municipalityName: result.municipalityName, code: result.municipalityCode })),
  );
  return (
    <main id="main" className="page-shell admin-shell">
      <p className="eyebrow">管理確認用</p><h1>クロール結果レビュー</h1>
      <p>{candidates.length}件の候補。承認はverifiedへの変更のみで、公開は行いません。</p>
      <div className="review-list">{candidates.map((item) => (
        <article className="result-card" key={`${item.code}-${item.id}`}>
          <p className="eyebrow">{item.municipalityName} / {item.categoryId} / 信頼度 {Math.round(item.confidence * 100)}%</p>
          <h2>{item.title}</h2><p>{item.description}</p>
          <dl><dt>出典</dt><dd><a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.sourceUrl}</a></dd>
            <dt>取得日時</dt><dd>{item.extractedAt}</dd><dt>状態</dt><dd>{item.status}</dd>
            <dt>警告</dt><dd>{item.warnings.join(" / ") || "なし"}</dd></dl>
          <details><summary>取得原文</summary><pre className="original-text">{item.originalText}</pre></details>
          <form action={reviewAction} className="review-actions">
            <input type="hidden" name="code" value={item.code} /><input type="hidden" name="id" value={item.id} />
            <button name="action" value="approve">承認</button><button name="action" value="approve-edited">修正して承認</button>
            <button name="action" value="reject">却下</button><button name="action" value="hold">保留</button>
            <button name="action" value="research">再調査</button>
          </form>
        </article>
      ))}</div>
    </main>
  );
}
