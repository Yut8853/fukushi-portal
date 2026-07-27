import { createHash } from "node:crypto";
import * as cheerio from "cheerio";
import { PDFParse } from "pdf-parse";
import { classify, toPortalCategory } from "./categories";
import type { CrawlCandidate } from "./types";

// Continuous 10–11 digit strings are intentionally excluded. Municipal PDFs
// frequently contain organization codes and form numbers that resemble phone
// numbers; accepting only visibly separated numbers is safer for public data.
const phonePattern = /(?:0\d{1,4}[-‐－ー ]\d{1,4}[-‐－ー ]\d{3,4}|#\d{4}|＃\d{4})/;
const addressPattern = /〒?\s*(\d{3}[-‐－]\d{4})?\s*([^\n。]{0,80}(?:都|道|府|県)[^\n。]{2,80})/;

function clean(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function findPhone(value: string): string {
  const matches = value.match(new RegExp(phonePattern, "g")) ?? [];
  return matches.find((match) => {
    if (match.startsWith("#") || match.startsWith("＃")) return true;
    const digits = match.replace(/\D/g, "");
    return digits.length === 10 || digits.length === 11;
  })?.replace(/[‐－ー ]/g, "-") ?? "";
}

export function findOpeningHours(value: string): string {
  const labels = /(?:受付時間|相談時間|開所時間|利用時間|開庁時間|業務時間)[：:\s・]*([^\n。]{2,120})/g;
  for (const match of value.matchAll(labels)) {
    const candidate = clean(match[1])
      .split(/(?:休業日|休所日|閉庁日|定休日|電話|Tel|TEL|住所)[：:]/, 1)[0]
      .replace(/^[\s、,）)は]+/, "")
      .trim();
    const clockRange = /(?:午前|午後)?\s*\d{1,2}\s*(?:時(?:\d{1,2}分)?|[:：]\d{2})\s*(?:から|～|〜|－|-)\s*(?:午前|午後)?\s*\d{1,2}\s*(?:時(?:\d{1,2}分)?|[:：]\d{2})/;
    if (clockRange.test(candidate) || /(?:24時間|２４時間)/.test(candidate)) {
      return candidate.slice(0, 100);
    }
  }
  return "";
}

export function findClosedDays(value: string): string {
  const match = value.match(/(?:休業日|休所日|閉庁日|定休日)[：:\s・]*([^\n。]{2,100})/);
  return match ? clean(match[1]).slice(0, 100) : "";
}

function candidateId(municipalityId: string, categoryId: string, sourceUrl: string): string {
  return createHash("sha256").update(`${municipalityId}:${categoryId}:${sourceUrl}`).digest("hex").slice(0, 20);
}

export function extractHtml(
  html: string,
  sourceUrl: string,
  municipalityId: string,
  officialUrl: string,
): { candidates: CrawlCandidate[]; links: { url: string; text: string }[] } {
  const $ = cheerio.load(html);
  $("script,style,noscript,form,input,textarea").remove();
  const title = clean(
    $("h1").first().text()
    || $('meta[property="og:title"]').attr("content")
    || $("title").text(),
  );
  const main = $("main,article,#main,.main").first();
  const originalText = clean((main.length ? main : $("body")).text()).slice(0, 20_000);
  const pageText = `${title}\n${originalText}`;
  const classes = classify(pageText);
  const phone = findPhone(pageText);
  const hours = findOpeningHours(pageText);
  const closedDays = findClosedDays(pageText);
  const addressMatch = pageText.match(addressPattern);
  const postalCode = addressMatch?.[1] ?? "";
  const address = addressMatch?.[2]?.trim() ?? "";
  const dateMatch = pageText.match(/(?:更新日|公開日|掲載日)[：:\s]*(20\d{2})年(\d{1,2})月(\d{1,2})日/);
  const sourcePublishedAt = dateMatch
    ? `${dateMatch[1]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[3].padStart(2, "0")}`
    : "";
  const warnings = sourcePublishedAt && Date.now() - new Date(sourcePublishedAt).getTime() > 730 * 86_400_000
    ? ["ページ公開・更新日から2年以上経過しています。"] : [];
  const candidates = classes.slice(0, 3).map(({ id, score }): CrawlCandidate => ({
    id: candidateId(municipalityId, id, sourceUrl),
    municipalityId, categoryId: toPortalCategory(id), title, plainTitle: title, department: "",
    description: originalText.slice(0, 500), targetPeople: "", supportType: "",
    amountDescription: "", repaymentRequired: null, applicationDeadline: "",
    requiredDocuments: "", documentsOptionalNote: "", applicationFlow: "",
    postalCode, address, phone, phoneOriginal: phone, fax: "", email: "", contactFormUrl: "",
    openingHours: hours, openingHoursOriginal: hours, closedDays,
    reservationRequired: null, availableMethods: "", accessibility: "", languages: "",
    emergencyAlternative: "",
    officialUrl, sourceUrl, sourceType: "html", sourcePublishedAt,
    extractedAt: new Date().toISOString(), originalText,
    extractionMethod: "static_html", confidence: Math.min(0.9, 0.45 + score * 0.15),
    status: "review_required", warnings,
    publicationTarget: "", reviewer: "", reviewNote: "", reviewedAt: "",
    publishedEntityId: "", publishedAt: "",
  }));
  const links = $("a[href]").map((_, element) => ({
    href: $(element).attr("href") ?? "",
    text: clean($(element).text() || $(element).attr("aria-label") || $(element).attr("title") || ""),
  })).get()
    .filter(({ href }) => href && !href.startsWith("#") && !href.startsWith("mailto:") && !href.startsWith("tel:"))
    .map(({ href, text }) => {
      try { return { url: new URL(href, sourceUrl).href, text }; } catch { return { url: "", text }; }
    }).filter((item) => Boolean(item.url));
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
      id: candidateId(municipalityId, id, sourceUrl), municipalityId, categoryId: toPortalCategory(id),
      title: text.split("\n")[0]?.slice(0, 160) || "PDF資料", plainTitle: "",
      department: "", description: text.slice(0, 500), targetPeople: "", supportType: "",
      amountDescription: "", repaymentRequired: null, applicationDeadline: "",
      requiredDocuments: "", documentsOptionalNote: "", applicationFlow: "", postalCode: "", address: "",
      phone: findPhone(text), phoneOriginal: findPhone(text),
      fax: "", email: "", contactFormUrl: "",
      openingHours: findOpeningHours(text), openingHoursOriginal: findOpeningHours(text),
      closedDays: findClosedDays(text), reservationRequired: null, availableMethods: "", accessibility: "",
      languages: "", emergencyAlternative: "", officialUrl, sourceUrl, sourceType: "pdf", sourcePublishedAt: "",
      extractedAt: new Date().toISOString(), originalText: text, extractionMethod: "pdf_text",
      confidence: Math.min(0.8, 0.4 + score * 0.15), status: "review_required",
      warnings: ["PDF由来のためレイアウトと項目対応を人間が確認してください。"],
      publicationTarget: "", reviewer: "", reviewNote: "", reviewedAt: "",
      publishedEntityId: "", publishedAt: "",
    }));
  } finally {
    await parser.destroy();
  }
}

export function deduplicate(candidates: CrawlCandidate[]): CrawlCandidate[] {
  const byKey = new Map<string, CrawlCandidate>();
  for (const candidate of candidates) {
    // Municipal CMSs often expose the same page at both category and department
    // URLs. Keep one review candidate when the human-facing content is identical.
    const key = `${candidate.categoryId}:${clean(candidate.title)}:${candidate.phone}`;
    const previous = byKey.get(key);
    if (!previous || candidate.confidence > previous.confidence) byKey.set(key, candidate);
  }
  return [...byKey.values()];
}
