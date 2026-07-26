import { createHash } from "node:crypto";
import * as cheerio from "cheerio";
import { PDFParse } from "pdf-parse";
import { classify } from "./categories";
import type { CrawlCandidate } from "./types";

const phonePattern = /(?:0\d{1,4}[-‐－ー ]?\d{1,4}[-‐－ー ]?\d{3,4}|#\d{4}|＃\d{4})/;
const hoursPattern = /(?:受付|開庁|相談|利用)?時間[：:\s]*([^\n。]{3,80})/;
const addressPattern = /〒?\s*(\d{3}[-‐－]\d{4})?\s*([^\n。]{0,80}(?:都|道|府|県)[^\n。]{2,80})/;

function clean(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function candidateId(municipalityId: string, categoryId: string, sourceUrl: string): string {
  return createHash("sha256").update(`${municipalityId}:${categoryId}:${sourceUrl}`).digest("hex").slice(0, 20);
}

export function extractHtml(
  html: string,
  sourceUrl: string,
  municipalityId: string,
  officialUrl: string,
): { candidates: CrawlCandidate[]; links: string[] } {
  const $ = cheerio.load(html);
  $("script,style,noscript,form,input,textarea").remove();
  const title = clean($("h1").first().text() || $("title").text());
  const main = $("main,article,#main,.main").first();
  const originalText = clean((main.length ? main : $("body")).text()).slice(0, 20_000);
  const pageText = `${title}\n${originalText}`;
  const classes = classify(pageText);
  const phone = pageText.match(phonePattern)?.[0]?.replace(/[‐－ー ]/g, "-") ?? "";
  const hours = pageText.match(hoursPattern)?.[1] ?? "";
  const addressMatch = pageText.match(addressPattern);
  const address = addressMatch ? `${addressMatch[1] ?? ""}${addressMatch[2] ?? ""}`.trim() : "";
  const dateMatch = pageText.match(/(?:更新日|公開日|掲載日)[：:\s]*(20\d{2})年(\d{1,2})月(\d{1,2})日/);
  const sourcePublishedAt = dateMatch
    ? `${dateMatch[1]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[3].padStart(2, "0")}`
    : "";
  const warnings = sourcePublishedAt && Date.now() - new Date(sourcePublishedAt).getTime() > 730 * 86_400_000
    ? ["ページ公開・更新日から2年以上経過しています。"] : [];
  const candidates = classes.slice(0, 3).map(({ id, score }): CrawlCandidate => ({
    id: candidateId(municipalityId, id, sourceUrl),
    municipalityId, categoryId: id, title, plainTitle: title, department: "",
    description: originalText.slice(0, 500), targetPeople: "", supportType: "",
    amountDescription: "", repaymentRequired: null, applicationDeadline: "",
    requiredDocuments: "", documentsOptionalNote: "", applicationFlow: "",
    address, phone, phoneOriginal: phone, fax: "", email: "", contactFormUrl: "",
    openingHours: hours, openingHoursOriginal: hours, closedDays: "",
    reservationRequired: null, availableMethods: "", accessibility: "", languages: "",
    officialUrl, sourceUrl, sourceType: "html", sourcePublishedAt,
    extractedAt: new Date().toISOString(), originalText,
    extractionMethod: "static_html", confidence: Math.min(0.9, 0.45 + score * 0.15),
    status: "review_required", warnings,
  }));
  const links = $("a[href]").map((_, element) => $(element).attr("href") ?? "").get()
    .filter((href) => href && !href.startsWith("#") && !href.startsWith("mailto:") && !href.startsWith("tel:"))
    .map((href) => {
      try { return new URL(href, sourceUrl).href; } catch { return ""; }
    }).filter(Boolean);
  return { candidates, links };
}

export async function extractPdf(
  data: Uint8Array,
  sourceUrl: string,
  municipalityId: string,
  officialUrl: string,
): Promise<CrawlCandidate[]> {
  const parser = new PDFParse({ data });
  try {
    const result = await parser.getText();
    const text = clean(result.text).slice(0, 20_000);
    return classify(text).slice(0, 3).map(({ id, score }) => ({
      id: candidateId(municipalityId, id, sourceUrl), municipalityId, categoryId: id,
      title: text.split("\n")[0]?.slice(0, 160) || "PDF資料", plainTitle: "",
      department: "", description: text.slice(0, 500), targetPeople: "", supportType: "",
      amountDescription: "", repaymentRequired: null, applicationDeadline: "",
      requiredDocuments: "", documentsOptionalNote: "", applicationFlow: "", address: "",
      phone: text.match(phonePattern)?.[0] ?? "", phoneOriginal: text.match(phonePattern)?.[0] ?? "",
      fax: "", email: "", contactFormUrl: "", openingHours: "", openingHoursOriginal: "",
      closedDays: "", reservationRequired: null, availableMethods: "", accessibility: "",
      languages: "", officialUrl, sourceUrl, sourceType: "pdf", sourcePublishedAt: "",
      extractedAt: new Date().toISOString(), originalText: text, extractionMethod: "pdf_text",
      confidence: Math.min(0.8, 0.4 + score * 0.15), status: "review_required",
      warnings: ["PDF由来のためレイアウトと項目対応を人間が確認してください。"],
    }));
  } finally {
    await parser.destroy();
  }
}

export function deduplicate(candidates: CrawlCandidate[]): CrawlCandidate[] {
  const byKey = new Map<string, CrawlCandidate>();
  for (const candidate of candidates) {
    const key = `${candidate.categoryId}:${candidate.sourceUrl}:${candidate.phone}`;
    const previous = byKey.get(key);
    if (!previous || candidate.confidence > previous.confidence) byKey.set(key, candidate);
  }
  return [...byKey.values()];
}
