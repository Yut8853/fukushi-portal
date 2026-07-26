import type { CrawlerConfig } from "./config";
import { canCrawl, fetchWithRetry } from "./fetcher";
import { deduplicate, extractHtml, extractPdf } from "./extractor";
import { sameOfficialSite, assertSafeUrl } from "./security";
import { updateJob, writeResult } from "./store";
import type { CrawlCandidate, CrawlJob, CrawlResult } from "./types";

export async function crawlMunicipality(job: CrawlJob, config: CrawlerConfig): Promise<CrawlResult> {
  const startedAt = new Date().toISOString();
  await updateJob(job.municipalityId, { status: "running", startedAt, attemptCount: job.attemptCount + 1, lastError: "" });
  const official = await assertSafeUrl(job.officialUrl);
  const queue = [official.href];
  const visited = new Set<string>();
  const candidates: CrawlCandidate[] = [];
  let documentsParsed = 0;
  let blocked = 0;
  try {
    while (queue.length && visited.size < config.maxPages) {
      const rawUrl = queue.shift();
      if (!rawUrl || visited.has(rawUrl)) continue;
      const url = await assertSafeUrl(rawUrl);
      if (!sameOfficialSite(url, official)) continue;
      if (!await canCrawl(url.href, config)) { blocked += 1; continue; }
      visited.add(url.href);
      const response = await fetchWithRetry(url.href, config);
      const type = response.headers.get("content-type")?.toLowerCase() ?? "";
      if (type.includes("application/pdf") || url.pathname.toLowerCase().endsWith(".pdf")) {
        candidates.push(...await extractPdf(new Uint8Array(await response.arrayBuffer()), url.href, job.municipalityId, official.href));
        documentsParsed += 1;
        continue;
      }
      if (!type.includes("html") && !url.pathname.match(/\/$/)) continue;
      const extracted = extractHtml(await response.text(), url.href, job.municipalityId, official.href);
      candidates.push(...extracted.candidates);
      const interesting = extracted.links.filter((link) =>
        /福祉|生活|相談|支援|給付|困窮|保護|障害|介護|子育|ひとり親|DV|ＤＶ|虐待|債務|法律|food|welfare|support|\.pdf/i.test(link),
      );
      for (const link of interesting) if (!visited.has(link) && !queue.includes(link)) queue.push(link);
    }
    const unique = deduplicate(candidates);
    const status = unique.length ? "review_required" : blocked && !visited.size ? "blocked_by_robots" : "partial";
    const completedAt = new Date().toISOString();
    const completedJob: CrawlJob = {
      ...job, status, startedAt, completedAt, attemptCount: job.attemptCount + 1,
      pagesVisited: visited.size, documentsParsed, candidatesFound: unique.length,
      lastError: unique.length ? "" : "支援情報候補を抽出できませんでした。", nextRetryAt: "",
    };
    const result: CrawlResult = {
      schemaVersion: 1, municipalityId: job.municipalityId,
      municipalityCode: job.municipalityCode, municipalityName: job.municipalityName,
      officialUrl: official.href, job: completedJob, candidates: unique,
    };
    await writeResult(result);
    await updateJob(job.municipalityId, completedJob);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const attemptCount = job.attemptCount + 1;
    const retry = attemptCount <= config.maxRetries && !message.includes("403");
    await updateJob(job.municipalityId, {
      status: retry ? "retry_waiting" : "failed", completedAt: new Date().toISOString(),
      attemptCount, lastError: message, pagesVisited: visited.size, documentsParsed,
      candidatesFound: candidates.length,
      nextRetryAt: retry ? new Date(Date.now() + 1000 * 2 ** attemptCount).toISOString() : "",
    });
    throw error;
  }
}
