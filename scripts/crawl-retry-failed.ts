import { readQueue, writeQueue } from "../crawler/store";

async function main() {
const args = process.argv.slice(2);
const prefecture = args.find((arg) => arg.startsWith("--prefecture="))?.split("=")[1];
const code = args.find((arg) => arg.startsWith("--municipality="))?.split("=")[1];
const jobs = await readQueue();
let count = 0;
for (const job of jobs) {
  const matches = (!prefecture || job.prefectureCode === prefecture)
    && (!code || job.municipalityCode.startsWith(code.slice(0, 5)));
  if (matches && ["failed", "partial", "retry_waiting"].includes(job.status)) {
    job.status = "pending"; job.nextRetryAt = ""; job.lastError = ""; count += 1;
  }
}
await writeQueue(jobs);
console.log(`再実行待ちへ戻しました: ${count}件`);
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
