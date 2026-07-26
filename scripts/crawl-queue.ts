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

function municipalityCodeKey(code: string): string {
  return code.replace(/\D/g, "").slice(0, 5);
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
  const byCode = new Map(existing.map((job) => [municipalityCodeKey(job.municipalityCode), job]));
  const duplicatesRemoved = existing.length - byCode.size;
  let added = 0;
  for (const item of selected) {
    const key = municipalityCodeKey(item.municipalityCode);
    const current = byCode.get(key);
    if (!current) {
      byCode.set(key, emptyJob(item));
      added += 1;
      continue;
    }
    byCode.set(key, {
      ...current,
      municipalityId: item.id,
      municipalityCode: item.municipalityCode,
      municipalityName: item.name,
      prefectureCode: item.prefectureCode,
      officialUrl: item.officialUrl,
    });
  }
  await writeQueue([...byCode.values()]);
  console.log(`キュー追加: ${added}件 / 重複統合: ${duplicatesRemoved}件 / URL未登録で除外: ${missingUrls.length}件 / キュー総数: ${byCode.size}件`);
  if (missingUrls.length) console.log(`URL未登録例: ${missingUrls.slice(0, 10).map((item) => `${item.municipalityCode}:${item.name}`).join(", ")}`);
}
main().catch((error: unknown) => { console.error(`エラー: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1; });
