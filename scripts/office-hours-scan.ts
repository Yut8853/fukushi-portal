import path from "node:path";
import { mkdir, rename, writeFile } from "node:fs/promises";
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

async function responseText(response: Response, url: URL): Promise<string> {
  const type = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (type.includes("application/pdf") || url.pathname.toLowerCase().endsWith(".pdf")) {
    const parser = new PDFParse({ data: new Uint8Array(await response.arrayBuffer()) });
    try {
      return (await parser.getText()).text;
    } finally {
      await parser.destroy();
    }
  }
  const $ = cheerio.load(await response.text());
  $("script,style,noscript").remove();
  return $("body").text().replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n");
}

async function main() {
  const config = getCrawlerConfig();
  const data = await getPublicPortalData();
  const typeArgument = process.argv.find((argument) => argument.startsWith("--type="))?.split("=")[1] ?? "all";
  const requestedType = typeArgument === "all" ? null : typeArgument as OfficeContactType;
  const limitArgument = process.argv.find((argument) => argument.startsWith("--limit="))?.split("=")[1];
  const sourceLimit = limitArgument ? Number.parseInt(limitArgument, 10) : Number.POSITIVE_INFINITY;
  const offsetArgument = process.argv.find((argument) => argument.startsWith("--offset="))?.split("=")[1];
  const sourceOffset = offsetArgument ? Number.parseInt(offsetArgument, 10) : 0;
  const sources = new Map(data.sources.map((source) => [source.id, source.url]));
  const targets = data.offices
    .filter((office) =>
      office.phone
      && (!requestedType || officeContactType(office) === requestedType)
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
  const errors: { sourceUrl: string; message: string }[] = [];
  let processed = 0;
  let nextGroup = 0;
  const selectedGroups = [...groups].slice(sourceOffset, sourceOffset + sourceLimit);
  async function worker() {
    while (nextGroup < selectedGroups.length) {
      const [sourceUrl, offices] = selectedGroups[nextGroup];
      nextGroup += 1;
      try {
        const url = await assertSafeUrl(sourceUrl);
        if (!await canCrawl(url.href, config)) {
          errors.push({ sourceUrl, message: "robots.txtで取得不可" });
        } else {
          const text = await responseText(await fetchWithRetry(url.href, config), url);
          for (const { office } of offices) {
            if (office.openingHours) continue;
            const context = phoneContext(text, office.phone);
            if (!context) continue;
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
    sourceCount: groups.size,
    scannedSourceCount: processed,
    sourceOffset,
    requestedType: requestedType ?? "all",
    candidates,
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
