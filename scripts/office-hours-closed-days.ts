import path from "node:path";
import { readFile, rename, writeFile } from "node:fs/promises";
import { escapeCsv, parseCsv } from "../lib/csv";
import { getPublicPortalData } from "../lib/data/repository";

function derivedClosedDays(openingHours: string): string {
  if (/平日/.test(openingHours)) return "土曜日・日曜日・祝日";
  if (/(?:月曜日から金曜日|月曜(?:日)?[～〜~-]金曜(?:日)?)/.test(openingHours)) {
    return "土曜日・日曜日";
  }
  return "";
}

async function main() {
  const apply = process.argv.includes("--apply");
  const data = await getPublicPortalData();
  const eligibleUpdates = new Map<string, string>();
  for (const office of data.offices) {
    if (!office.openingHours || office.closedDays) continue;
    const closedDays = derivedClosedDays(office.openingHours);
    if (closedDays) eligibleUpdates.set(office.id, closedDays);
  }
  const officesPath = path.join(process.cwd(), "data", "offices.csv");
  const text = await readFile(officesPath, "utf8");
  const [headerLine, ...lines] = text.trimEnd().split(/\r?\n/);
  const headers = headerLine.split(",");
  let updated = 0;
  const outputLines = lines.map((line) => {
    const officeId = line.slice(0, line.indexOf(","));
    const closedDays = eligibleUpdates.get(officeId);
    if (!closedDays) return line;
    const row = parseCsv(`${headerLine}\n${line}\n`)[0];
    if (!row || row.closedDays) return line;
    if (!apply) return line;
    row.closedDays = closedDays;
    row.lastVerifiedAt = new Date().toISOString().slice(0, 10);
    updated += 1;
    return headers.map((header) => escapeCsv(row[header] ?? "")).join(",");
  });
  console.log(`受付曜日から休業日を確認可能: ${eligibleUpdates.size}件`);
  if (!apply) {
    console.log("反映するには --apply を指定してください。");
    return;
  }
  const temporary = `${officesPath}.${process.pid}.tmp`;
  await writeFile(temporary, `${headerLine}\n${outputLines.join("\n")}\n`, "utf8");
  await rename(temporary, officesPath);
  console.log(`休業日を反映: ${updated}件`);
}

void main();
