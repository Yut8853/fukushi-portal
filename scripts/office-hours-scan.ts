import path from "node:path";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import * as cheerio from "cheerio";
import { PDFParse } from "pdf-parse";
import { getCrawlerConfig } from "../crawler/config";
import { canCrawl, fetchWithRetry } from "../crawler/fetcher";
import { findClosedDays, findOpeningHours } from "../crawler/extractor";
import { assertSafeUrl } from "../crawler/security";
import { getPublicPortalData } from "../lib/data/repository";
import { officeContactType, type OfficeContactType } from "../lib/support-routing";

type HoursCandidate = {
  officeId: string;
  municipalityId: string;
  officeName: string;
  phone: string;
  openingHours: string;
  closedDays: string;
  sourceUrl: string;
  evidenceText: string;
  evidenceDistance: number;
  confidence: "medium";
  warnings: string[];
  status: "review_required";
};

function digits(value: string): string {
  return value.replace(/\D/g, "");
}

function phoneContext(text: string, phone: string): { text: string; phoneOffset: number } | null {
  const number = digits(phone);
  if (number.length < 10) return null;
  const flexible = new RegExp(number.split("").join("[^0-9]{0,3}"));
  const match = flexible.exec(text);
  if (!match) return null;
  const start = Math.max(0, match.index - 260);
  return {
    text: text.slice(start, Math.min(text.length, match.index + match[0].length + 300)),
    phoneOffset: match.index - start,
  };
}

type PageContent = { text: string; relatedLinks: string[] };

async function responseContent(response: Response, url: URL): Promise<PageContent> {
  const type = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (type.includes("application/pdf") || url.pathname.toLowerCase().endsWith(".pdf")) {
    const parser = new PDFParse({ data: new Uint8Array(await response.arrayBuffer()) });
    try {
      return { text: (await parser.getText()).text, relatedLinks: [] };
    } finally {
      await parser.destroy();
    }
  }
  const $ = cheerio.load(await response.text());
  const relatedLinks = $("a[href]").toArray().flatMap((element) => {
    const label = $(element).text().replace(/\s+/g, "");
    if (!/(?:開庁|開館|業務時間|受付時間|庁舎案内|市役所案内|役場案内|アクセス|施設案内|所在地)/.test(label)) {
      return [];
    }
    const href = $(element).attr("href");
    if (!href) return [];
    try {
      const linked = new URL(href, url);
      return linked.origin === url.origin && /^https?:$/.test(linked.protocol) ? [linked.href] : [];
    } catch {
      return [];
    }
  });
  $("script,style,noscript").remove();
  return {
    text: $("body").text().replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n"),
    relatedLinks: [...new Set(relatedLinks)].slice(0, 3),
  };
}

async function main() {
  const config = getCrawlerConfig();
  const data = await getPublicPortalData();
  const typeArgument = process.argv.find((argument) => argument.startsWith("--type="))?.split("=")[1] ?? "all";
  const requestedType = typeArgument === "all" ? null : typeArgument as OfficeContactType;
  const categoryArgument = process.argv
    .find((argument) => argument.startsWith("--category="))
    ?.split("=")[1];
  const scopeArgument = process.argv
    .find((argument) => argument.startsWith("--scope="))
    ?.split("=")[1];
  const discoverRelatedPages = process.argv.includes("--discover");
  const retryReportErrors = process.argv.includes("--retry-errors");
  const limitArgument = process.argv.find((argument) => argument.startsWith("--limit="))?.split("=")[1];
  const sourceLimit = limitArgument ? Number.parseInt(limitArgument, 10) : Number.POSITIVE_INFINITY;
  const offsetArgument = process.argv.find((argument) => argument.startsWith("--offset="))?.split("=")[1];
  const sourceOffset = offsetArgument ? Number.parseInt(offsetArgument, 10) : 0;
  const sources = new Map(data.sources.map((source) => [source.id, source.url]));
  const targets = data.offices
    .filter((office) =>
      office.phone
      && (!requestedType || officeContactType(office) === requestedType)
      && (!categoryArgument || office.categoryId === categoryArgument)
      && (!scopeArgument || office.scope === scopeArgument)
    )
    .map((office) => ({ office, sourceUrl: office.officialUrl || sources.get(office.sourceId) || "" }))
    .filter((item) => item.sourceUrl);
  const groups = new Map<string, typeof targets>();
  for (const target of targets) {
    const list = groups.get(target.sourceUrl) ?? [];
    list.push(target);
    groups.set(target.sourceUrl, list);
  }
  const candidates: HoursCandidate[] = [];
  const evidenceByOffice = new Map<
    string,
    { officeId: string; officeName: string; phone: string; sourceUrl: string; evidenceText: string }
  >();
  const errors: { sourceUrl: string; message: string }[] = [];
  let processed = 0;
  let nextGroup = 0;
  let selectableGroups = discoverRelatedPages
    ? [...groups].filter(([, offices]) => offices.some(({ office }) => !office.openingHours))
    : [...groups];
  if (retryReportErrors) {
    const previousReportPath = path.join(process.cwd(), "data", "crawl", "office-hours-candidates.json");
    const previousReport = JSON.parse(await readFile(previousReportPath, "utf8")) as {
      errors?: { sourceUrl: string }[];
    };
    const retryUrls = new Set((previousReport.errors ?? []).map(({ sourceUrl }) => sourceUrl));
    selectableGroups = selectableGroups.filter(([sourceUrl]) => retryUrls.has(sourceUrl));
  }
  const selectedGroups = selectableGroups.slice(sourceOffset, sourceOffset + sourceLimit);
  const selectedOfficeIds = new Set(
    selectedGroups.flatMap(([, selectedOffices]) =>
      selectedOffices.map(({ office }) => office.id),
    ),
  );
  function collectCandidates(text: string, url: URL, offices: (typeof targets)) {
    let found = 0;
    for (const { office } of offices) {
      if (office.openingHours) continue;
      const context = phoneContext(text, office.phone);
      if (!context) continue;
      evidenceByOffice.set(office.id, {
        officeId: office.id,
        officeName: office.name,
        phone: office.phone,
        sourceUrl: url.href,
        evidenceText: context.text.replace(/\s+/g, " ").trim(),
      });
      const openingHours = findOpeningHours(context.text);
      if (!openingHours) continue;
      const hoursOffset = context.text.indexOf(openingHours);
      const evidenceDistance = Math.abs(hoursOffset - context.phoneOffset);
      if (evidenceDistance > 250) continue;
      candidates.push({
        officeId: office.id,
        municipalityId: office.municipalityId,
        officeName: office.plainName || office.name,
        phone: office.phone,
        openingHours,
        closedDays: findClosedDays(context.text),
        sourceUrl: url.href,
        evidenceText: context.text.replace(/\s+/g, " ").trim(),
        evidenceDistance,
        confidence: "medium",
        warnings: ["公式ページ内の近接情報です。窓口固有の受付時間か目視確認してください。"],
        status: "review_required",
      });
      found += 1;
    }
    return found;
  }
  async function worker() {
    while (nextGroup < selectedGroups.length) {
      const [sourceUrl, offices] = selectedGroups[nextGroup];
      nextGroup += 1;
      try {
        let url = await assertSafeUrl(sourceUrl);
        if (!await canCrawl(url.href, config)) {
          errors.push({ sourceUrl, message: "robots.txtで取得不可" });
        } else {
          let response: Response;
          try {
            response = await fetchWithRetry(url.href, config);
          } catch (error) {
            if (url.protocol !== "http:") throw error;
            const secureUrl = new URL(url);
            secureUrl.protocol = "https:";
            url = await assertSafeUrl(secureUrl.href);
            if (!await canCrawl(url.href, config)) throw error;
            response = await fetchWithRetry(url.href, config);
          }
          const page = await responseContent(response, url);
          const found = collectCandidates(page.text, url, offices);
          if (discoverRelatedPages && found === 0) {
            for (const relatedHref of page.relatedLinks) {
              try {
                const relatedUrl = await assertSafeUrl(relatedHref);
                if (!await canCrawl(relatedUrl.href, config)) continue;
                const relatedPage = await responseContent(
                  await fetchWithRetry(relatedUrl.href, config),
                  relatedUrl,
                );
                if (collectCandidates(relatedPage.text, relatedUrl, offices) > 0) break;
              } catch (error) {
                errors.push({
                  sourceUrl: relatedHref,
                  message: `内部リンク: ${error instanceof Error ? error.message : String(error)}`,
                });
              }
            }
          }
        }
      } catch (error) {
        errors.push({ sourceUrl, message: error instanceof Error ? error.message : String(error) });
      } finally {
        processed += 1;
        console.log(`進捗 ${processed}/${selectedGroups.length} / 候補 ${candidates.length}件 / 取得失敗 ${errors.length}件`);
      }
    }
  }
  await Promise.all(Array.from(
    { length: Math.min(config.concurrency, selectedGroups.length) },
    () => worker(),
  ));
  const report = {
    generatedAt: new Date().toISOString(),
    targetOffices: targets.filter(({ office }) => !office.openingHours).length,
    sourceCount: selectableGroups.length,
    scannedSourceCount: processed,
    sourceOffset,
    requestedType: requestedType ?? "all",
    requestedCategory: categoryArgument ?? "all",
    requestedScope: scopeArgument ?? "all",
    discoverRelatedPages,
    retryReportErrors,
    candidates,
    unresolved: targets
      .filter(
        ({ office }) =>
          selectedOfficeIds.has(office.id) &&
          !office.openingHours &&
          !candidates.some((candidate) => candidate.officeId === office.id),
      )
      .map(({ office, sourceUrl }) =>
        evidenceByOffice.get(office.id) ?? {
          officeId: office.id,
          officeName: office.name,
          phone: office.phone,
          sourceUrl,
          evidenceText: "",
        },
      ),
    errors,
  };
  const output = path.join(process.cwd(), "data", "crawl", "office-hours-candidates.json");
  await mkdir(path.dirname(output), { recursive: true });
  const temporary = `${output}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await rename(temporary, output);
  console.log(`受付時間レビュー候補: ${candidates.length}件 / 出力: ${output}`);
}

void main();
