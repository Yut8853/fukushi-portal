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

// 2026-07-27に公式ページの電話番号周辺の文脈を目視確認した複数時間帯の代表窓口。
// 自動正規化では「窓口」と「電話」の時間を取り違えるため、確認した表記を固定する。
const reviewedOverrides = new Map<string, { hours: string; closedDays: string }>([
  ["jp-09210-city-general", { hours: "電話受付：午前8時30分から午後5時15分まで", closedDays: "土曜日・日曜日・祝日・年末年始" }],
  ["jp-12215-city-general", { hours: "電話受付：午前8時30分から午後5時15分まで", closedDays: "土曜日・日曜日・祝日・年末年始" }],
  ["jp-14215-city-general", { hours: "月曜日から金曜日 8時30分から17時15分", closedDays: "日曜日・祝日・休日・年末年始" }],
  ["jp-17463-city-general", { hours: "8時30分から17時15分", closedDays: "土曜日・日曜日・祝日・年末年始" }],
  ["jp-23205-city-general", { hours: "9時から16時（水曜日は19時まで）", closedDays: "土曜日・日曜日・祝日・年末年始" }],
  ["jp-23233-city-general", { hours: "月曜日から金曜日 午前9時から午後4時まで", closedDays: "土曜日・日曜日・祝日・休日・年末年始" }],
  ["jp-23232-city-general", { hours: "午前8時30分から午後5時15分", closedDays: "土曜日・日曜日・祝日・年末年始" }],
  ["jp-23446-city-general", { hours: "電話受付：午前8時30分から午後5時15分まで", closedDays: "土曜日・日曜日・祝日・年末年始" }],
  ["jp-24341-city-general", { hours: "役場本庁：9時から16時30分まで", closedDays: "土曜日・日曜日・祝日・年末年始" }],
  ["jp-24461-city-general", { hours: "月・水・金 8時45分から16時30分／火・木 8時45分から19時", closedDays: "土曜日・日曜日・祝日" }],
  ["jp-26100-city-general", { hours: "市役所本庁舎：午前8時45分から午後5時30分", closedDays: "土曜日・日曜日・祝日・年末年始" }],
  ["jp-28481-city-general", { hours: "8時30分から17時15分", closedDays: "" }],
  ["jp-47211-city-general", { hours: "午前8時30分から正午、午後1時から午後5時15分", closedDays: "土曜日・日曜日・祝日・慰霊の日・年末年始" }],
  ["jp-01219-city-general", { hours: "月曜日から金曜日 8時45分から17時30分", closedDays: "土曜日・日曜日" }],
]);

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
    const reviewed = reviewedOverrides.get(candidate.officeId);
    if (reviewed) {
      accepted.set(candidate.officeId, reviewed);
      continue;
    }
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
