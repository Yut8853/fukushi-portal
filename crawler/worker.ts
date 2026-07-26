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
  const queue: { url: string; priority: number }[] = [{ url: official.href, priority: 1000 }];
  const queuedPriorities = new Map([[official.href, 1000]]);
  const visited = new Set<string>();
  const candidates: CrawlCandidate[] = [];
  const pageErrors: string[] = [];
  let documentsParsed = 0;
  let blocked = 0;
  try {
    while (queue.length && visited.size < config.maxPages) {
      queue.sort((left, right) => right.priority - left.priority);
      const queued = queue.shift();
      if (!queued || visited.has(queued.url)) continue;
      if (queuedPriorities.get(queued.url) !== queued.priority) continue;
      queuedPriorities.delete(queued.url);
      const url = await assertSafeUrl(queued.url);
      if (!sameOfficialSite(url, official)) continue;
      if (!await canCrawl(url.href, config)) { blocked += 1; continue; }
      visited.add(url.href);
      let response: Response;
      try {
        response = await fetchWithRetry(url.href, config);
      } catch (error) {
        if (url.href === official.href) throw error;
        pageErrors.push(`${url.href}: ${error instanceof Error ? error.message : String(error)}`);
        continue;
      }
      const type = response.headers.get("content-type")?.toLowerCase() ?? "";
      if (type.includes("application/pdf") || url.pathname.toLowerCase().endsWith(".pdf")) {
        candidates.push(...await extractPdf(new Uint8Array(await response.arrayBuffer()), url.href, job.municipalityId, official.href));
        documentsParsed += 1;
        continue;
      }
      if (!type.includes("html") && !url.pathname.match(/\/$/)) continue;
      const extracted = extractHtml(await response.text(), url.href, job.municipalityId, official.href);
      const isHomepage = url.pathname === "/" || url.pathname === "";
      if (!isHomepage && titleIsSpecific(extracted.candidates)) candidates.push(...extracted.candidates);
      const keywordPattern = /福祉|生活|相談|支援|給付|困窮|保護|障害|介護|子育|ひとり親|DV|ＤＶ|虐待|債務|法律|住居|家賃|食料|food|welfare|support/i;
      const actionablePattern = /相談|申請|窓口|生活保護|生活困窮|自立相談|住居確保|福祉事務所|社会福祉協議会|地域包括|こころの相談|精神保健|ひとり親|DV相談|ＤＶ相談|児童虐待|多重債務|法律相談|緊急宿泊|シェルター/i;
      const coreNeedPattern = /生活保護|生活困窮|自立相談|住居確保|福祉事務所|社会福祉協議会|地域包括|こころ|精神保健|ひとり親|DV|ＤＶ|児童虐待|多重債務|法律相談|緊急宿泊|シェルター/i;
      const administrativePattern = /計画|進捗|評価|会議|議事|要綱|条例|統計|実績|募集|入札|事業者向け|申請書|依頼書/i;
      const interesting = extracted.links
        .map((link) => {
          const searchable = `${link.text} ${link.url}`;
          const keywordMatches = searchable.match(new RegExp(keywordPattern, "gi"))?.length ?? 0;
          const pdfFromRelevantPage = extracted.candidates.length > 0 && link.url.toLowerCase().endsWith(".pdf");
          const actionable = actionablePattern.test(searchable);
          const coreNeed = coreNeedPattern.test(searchable);
          const administrative = administrativePattern.test(searchable);
          return {
            ...link,
            score: keywordMatches
              ? keywordMatches * 10 + (actionable ? 60 : 0) + (coreNeed ? 100 : 0)
                + (pdfFromRelevantPage ? 5 : 0) - (administrative ? 80 : 0)
              : 0,
          };
        })
        .filter((link) => link.score > 0)
        .sort((left, right) => right.score - left.score);
      for (const link of interesting) {
        if (visited.has(link.url)) continue;
        const previousPriority = queuedPriorities.get(link.url) ?? -1;
        if (previousPriority >= link.score) continue;
        queuedPriorities.set(link.url, link.score);
        queue.push({ url: link.url, priority: link.score });
      }
    }
    const unique = deduplicate(candidates);
    const status = unique.length
      ? pageErrors.length ? "partial" : "review_required"
      : blocked && !visited.size ? "blocked_by_robots" : "partial";
    const completedAt = new Date().toISOString();
    const completedJob: CrawlJob = {
      ...job, status, startedAt, completedAt, attemptCount: job.attemptCount + 1,
      pagesVisited: visited.size, documentsParsed, candidatesFound: unique.length,
      lastError: pageErrors.length
        ? `${pageErrors.length}ページの取得に失敗: ${pageErrors.slice(0, 3).join(" / ")}`
        : unique.length ? "" : "支援情報候補を抽出できませんでした。",
      nextRetryAt: "",
    };
    const result: CrawlResult = {
      schemaVersion: 2, municipalityId: job.municipalityId,
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

function titleIsSpecific(candidates: CrawlCandidate[]): boolean {
  return candidates.some((candidate) => {
    const title = candidate.title.split(" - ")[0].trim();
    if (title.length < 3) return false;
    return !/^(?:健康と福祉|健康・医療・福祉|福祉・介護|子育て|介護・高齢|障害者福祉|障害児・障害者|社会福祉法人・社会福祉事業等)$/.test(title)
      && !/(?:お知らせ)?一覧$/.test(title)
      && title !== "オンライン申請可能な手続き"
      && !/(?:計画|進捗|評価|会議|議事|要綱|条例|統計|実績|募集|入札|申請書|依頼書)/.test(title);
  });
}
