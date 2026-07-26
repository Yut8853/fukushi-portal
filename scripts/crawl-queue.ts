import { loadCrawlMunicipalities, findByCode } from "../crawler/municipalities";
import { readQueue, writeQueue } from "../crawler/store";
import type { CrawlJob } from "../crawler/types";

function emptyJob(item: Awaited<ReturnType<typeof loadCrawlMunicipalities>>[number]): CrawlJob {
  return {
    municipalityId: item.id, municipalityCode: item.municipalityCode,
    municipalityName: item.name, prefectureCode: item.prefectureCode,
    officialUrl: item.officialUrl, status: "pending", startedAt: "", completedAt: "",
    attemptCount: 0, lastError: "", pagesVisited: 0, documentsParsed: 0,
    candidatesFound: 0, nextRetryAt: "",
  };
}

async function main() {
  const args = process.argv.slice(2);
  const all = args.includes("--all");
  const prefecture = args.find((arg) => arg.startsWith("--prefecture="))?.split("=")[1];
  const codes = args.find((arg) => arg.startsWith("--municipalities="))?.split("=")[1]?.split(",").filter(Boolean);
  if (!all && !prefecture && !codes?.length) {
    throw new Error("--all、--prefecture=08、または --municipalities=082015,082201 を指定してください。");
  }
  const municipalities = await loadCrawlMunicipalities();
  let selected = all
    ? municipalities.filter((item) => item.entityType === "municipality" && item.lifecycleStatus === "current")
    : prefecture
      ? municipalities.filter((item) => item.prefectureCode === prefecture && item.entityType === "municipality" && item.lifecycleStatus === "current")
      : codes?.map((code) => {
        const item = findByCode(municipalities, code);
        if (!item) throw new Error(`自治体コード ${code} が見つかりません。`);
        return item;
      }) ?? [];
  const missingUrls = selected.filter((item) => !item.officialUrl);
  selected = selected.filter((item) => item.officialUrl);
  const existing = await readQueue();
  const byId = new Map(existing.map((job) => [job.municipalityId, job]));
  let added = 0;
  for (const item of selected) {
    if (!byId.has(item.id)) { byId.set(item.id, emptyJob(item)); added += 1; }
  }
  await writeQueue([...byId.values()]);
  console.log(`キュー追加: ${added}件 / URL未登録で除外: ${missingUrls.length}件 / キュー総数: ${byId.size}件`);
  if (missingUrls.length) console.log(`URL未登録例: ${missingUrls.slice(0, 10).map((item) => `${item.municipalityCode}:${item.name}`).join(", ")}`);
}
main().catch((error: unknown) => { console.error(`エラー: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1; });
