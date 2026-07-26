import { getCrawlerConfig } from "../crawler/config";
import { readQueue } from "../crawler/store";
import { crawlMunicipality } from "../crawler/worker";

async function main() {
  const config = getCrawlerConfig();
  const jobs = (await readQueue()).filter((job) =>
    job.status === "pending" || (job.status === "retry_waiting" && (!job.nextRetryAt || new Date(job.nextRetryAt) <= new Date())),
  );
  console.log(`処理対象 ${jobs.length}件 / 並列数 ${config.concurrency} / 間隔 ${config.delayMs}ms`);
  let cursor = 0;
  let success = 0;
  let partial = 0;
  let failed = 0;
  async function runner() {
    while (cursor < jobs.length) {
      const job = jobs[cursor];
      cursor += 1;
      try {
        const result = await crawlMunicipality(job, config);
        if (result.job.status === "review_required") success += 1; else partial += 1;
      } catch (error) {
        failed += 1;
        console.error(`${job.municipalityCode} ${job.municipalityName}: ${error instanceof Error ? error.message : String(error)}`);
      }
      const done = success + partial + failed;
      console.log(`進捗 ${done}/${jobs.length} (${jobs.length ? Math.floor(done / jobs.length * 100) : 100}%) 成功:${success} 部分:${partial} 失敗:${failed}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(config.concurrency, jobs.length) }, () => runner()));
}
main().catch((error: unknown) => { console.error(`エラー: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1; });
