import { readQueue } from "../crawler/store";

async function main() {
const jobs = await readQueue();
const counts = new Map<string, number>();
jobs.forEach((job) => counts.set(job.status, (counts.get(job.status) ?? 0) + 1));
const done = jobs.filter((job) => ["completed", "review_required", "partial", "failed", "blocked_by_robots", "skipped"].includes(job.status)).length;
console.log(`総数: ${jobs.length} / 処理済み: ${done} / 残件: ${jobs.length - done} / 進捗: ${jobs.length ? (done / jobs.length * 100).toFixed(1) : "0.0"}%`);
for (const [status, count] of [...counts].sort()) console.log(`${status}: ${count}`);
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
