import { readQueue, readResultByCode, writeQueue } from "../crawler/store";

async function main() {
const args = process.argv.slice(2);
const prefecture = args.find((arg) => arg.startsWith("--prefecture="))?.split("=")[1];
const code = args.find((arg) => arg.startsWith("--municipality="))?.split("=")[1];
const municipalityCodes = new Set(
  (args.find((arg) => arg.startsWith("--municipalities="))?.split("=")[1] ?? code ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);
const force = args.includes("--force");
if (force && !prefecture && municipalityCodes.size === 0 && !args.includes("--all")) {
  throw new Error("--force には --municipalities=自治体コード、--prefecture=都道府県コード、または --all が必要です。");
}
const jobs = await readQueue();
let count = 0;
for (const job of jobs) {
  const matches = (!prefecture || job.prefectureCode === prefecture)
    && (municipalityCodes.size === 0 || municipalityCodes.has(job.municipalityCode));
  // A previous retry command may have been interrupted after rewriting queue
  // state. Recover any completed result whose attempt number still matches.
  if ((job.status === "running" || (job.status === "pending" && job.attemptCount > 0))) {
    const result = await readResultByCode(job.municipalityCode);
    if (result?.job.completedAt && result.job.attemptCount === job.attemptCount) {
      Object.assign(job, result.job);
    }
  }
  if (matches && force && job.status !== "running") {
    const result = await readResultByCode(job.municipalityCode);
    const hasHumanReview = result?.candidates.some((candidate) =>
      candidate.status !== "review_required",
    ) ?? false;
    if (hasHumanReview) {
      console.warn(`${job.municipalityCode} ${job.municipalityName}: 人間のレビュー履歴があるため再投入しません。`);
      continue;
    }
    job.status = "pending"; job.nextRetryAt = ""; job.lastError = ""; count += 1;
    continue;
  }
  if (matches && ["failed", "partial", "retry_waiting"].includes(job.status)) {
    job.status = "pending"; job.nextRetryAt = ""; job.lastError = ""; count += 1;
  }
}
await writeQueue(jobs);
console.log(`再実行待ちへ戻しました: ${count}件`);
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
