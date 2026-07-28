import { getCrawlerConfig } from "../crawler/config";
import { readQueue } from "../crawler/store";
import { crawlMunicipality } from "../crawler/worker";

function baseCode(code: string): string {
  return code.replace(/\D/g, "").slice(0, 5);
}

async function main() {
  const config = getCrawlerConfig();
  const args = process.argv.slice(2);
  const all = args.includes("--all");
  const prefecture =
    args
      .find((arg) => arg.startsWith("--prefecture="))
      ?.split("=")[1]
      ?.trim() ?? "";
  const requestedCodes =
    args
      .find((arg) => arg.startsWith("--municipalities="))
      ?.split("=")[1]
      ?.split(",")
      .map(baseCode)
      .filter(Boolean) ?? [];
  const rawLimit = args.find((arg) => arg.startsWith("--limit="))?.split("=")[1] ?? "";
  const limit = rawLimit ? Number.parseInt(rawLimit, 10) : undefined;
  if (!all && !prefecture && !requestedCodes.length) {
    throw new Error(
      "安全のため対象指定が必要です。--all、--prefecture=08、または--municipalities=082015,082201を指定してください。",
    );
  }
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 10_000)) {
    throw new Error("--limitは1〜10000の整数で指定してください。");
  }
  const requestedCodeSet = new Set(requestedCodes);
  let jobs = (await readQueue()).filter(
    (job) =>
      job.status === "pending" ||
      (job.status === "retry_waiting" &&
        (!job.nextRetryAt || new Date(job.nextRetryAt) <= new Date())),
  );
  if (!all) {
    jobs = jobs.filter(
      (job) =>
        (prefecture && job.prefectureCode === prefecture) ||
        requestedCodeSet.has(baseCode(job.municipalityCode)),
    );
  }
  if (limit !== undefined) jobs = jobs.slice(0, limit);
  console.log(
    `処理対象 ${jobs.length}件 / 並列数 ${config.concurrency} / 間隔 ${config.delayMs}ms`,
  );
  if (!jobs.length) {
    console.log("指定条件に一致する未処理ジョブはありません。");
    return;
  }
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
        if (result.job.status === "review_required") success += 1;
        else partial += 1;
      } catch (error) {
        failed += 1;
        console.error(
          `${job.municipalityCode} ${job.municipalityName}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      const done = success + partial + failed;
      console.log(
        `進捗 ${done}/${jobs.length} (${jobs.length ? Math.floor((done / jobs.length) * 100) : 100}%) 成功:${success} 部分:${partial} 失敗:${failed}`,
      );
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(config.concurrency, jobs.length) }, () => runner()),
  );
}
main().catch((error: unknown) => {
  console.error(`エラー: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
