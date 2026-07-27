import path from "node:path";
import { readFile, rename, writeFile } from "node:fs/promises";
import { escapeCsv, parseCsv } from "../lib/csv";

type Candidate = {
  officeId: string;
  openingHours: string;
  closedDays: string;
  evidenceDistance: number;
  sourceUrl: string;
};

const clockRange =
  /(?:午前|午後)?\s*\d{1,2}\s*(?:時(?:\d{1,2}分)?|[:：]\d{2})\s*(?:から|～|〜|－|-)\s*(?:午前|午後)?\s*\d{1,2}\s*(?:時(?:\d{1,2}分)?|[:：]\d{2})/g;

function normalizedHours(value: string): string {
  const matches = [...value.matchAll(clockRange)];
  if (matches.length !== 1) return "";
  const range = matches[0][0].replace(/\s+/g, " ").trim();
  const before = value.slice(0, matches[0].index).replace(/^[^\p{L}\p{N}]+/u, "").trim();
  const weekday = before.match(/(?:平日|月曜日から金曜日|月曜(?:日)?[～〜~-]金曜(?:日)?)/)?.[0] ?? "";
  return `${weekday ? `${weekday} ` : ""}${range}`.slice(0, 100);
}

function normalizedClosedDays(value: string, openingHours: string): string {
  const text = `${value} ${openingHours}`;
  const days: string[] = [];
  if (/(?:土曜|土曜日|土・日|土日)/.test(text)) days.push("土曜日");
  if (/(?:日曜|日曜日|土・日|土日)/.test(text)) days.push("日曜日");
  if (/(?:祝日|祝祭日|祝・休日)/.test(text)) days.push("祝日");
  if (/(?:年末年始|12月29日.*1月3日)/.test(text)) days.push("年末年始");
  return [...new Set(days)].join("・");
}

async function main() {
  const apply = process.argv.includes("--apply");
  const reportPath = path.join(process.cwd(), "data", "crawl", "office-hours-candidates.json");
  const report = JSON.parse(await readFile(reportPath, "utf8")) as { candidates: Candidate[] };
  const accepted = new Map<string, { hours: string; closedDays: string }>();
  for (const candidate of report.candidates) {
    if (!candidate.officeId.endsWith("-city-general") || candidate.evidenceDistance > 250) continue;
    const hours = normalizedHours(candidate.openingHours);
    if (!hours) continue;
    accepted.set(candidate.officeId, {
      hours,
      closedDays: normalizedClosedDays(candidate.closedDays, candidate.openingHours),
    });
  }

  console.log(`高信頼候補: ${accepted.size}/${report.candidates.length}件`);
  if (!apply) {
    for (const [officeId, value] of accepted) console.log(`${officeId}\t${value.hours}\t${value.closedDays}`);
    console.log("反映するには --apply を指定してください。");
    return;
  }

  const officesPath = path.join(process.cwd(), "data", "offices.csv");
  const text = await readFile(officesPath, "utf8");
  const [headerLine, ...lines] = text.trimEnd().split(/\r?\n/);
  const headers = headerLine.split(",");
  let updated = 0;
  const outputLines = lines.map((line) => {
    const officeId = line.slice(0, line.indexOf(","));
    const candidate = accepted.get(officeId);
    if (!candidate) return line;
    const row = parseCsv(`${headerLine}\n${line}\n`)[0];
    if (!row || row.openingHours) return line;
    row.openingHours = candidate.hours;
    row.closedDays = candidate.closedDays;
    row.lastVerifiedAt = new Date().toISOString().slice(0, 10);
    updated += 1;
    return headers.map((header) => escapeCsv(row[header] ?? "")).join(",");
  });
  const temporary = `${officesPath}.${process.pid}.tmp`;
  await writeFile(temporary, `${headerLine}\n${outputLines.join("\n")}\n`, "utf8");
  await rename(temporary, officesPath);
  console.log(`受付時間を反映: ${updated}件`);
}

void main();
