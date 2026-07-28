import fs from "node:fs";
import path from "node:path";
import { parseCsv } from "../lib/csv";

type Hours = [string, string?];

const verifiedAt = "2026-07-28";
const hours: Record<string, Hours> = {
  "01": ["月曜日～金曜日 9:00～17:00・18:00～20:00、土曜日・日曜日・祝日 9:00～18:00", "12月29日～1月3日"],
  "02": ["平日 8:30～20:00、土曜日・日曜日・祝日 9:00～18:00"],
  "03": ["平日 9:00～16:00", "土曜日・日曜日・祝日"],
  "04": ["月曜日～金曜日 8:30～17:00", "祝日・年末年始"],
  "05": ["月曜日～金曜日 8:30～21:00、土曜日・日曜日・祝日 9:00～18:00", "年末年始"],
  "06": ["月曜日～金曜日 8:30～17:15", "祝日・年末年始"],
  "07": ["9:00～21:00", "祝日・年末年始"],
  "08": ["平日 9:00～21:00、土曜日・日曜日・祝日 9:00～17:00", "12月29日～1月3日"],
  "09": ["月曜日～金曜日 9:00～20:00、土曜日・日曜日 9:00～16:00", "祝日・休日・12月29日～1月3日"],
  "10": ["月曜日～土曜日 9:00～17:00", "祝日・年末年始"],
  "11": ["月曜日～水曜日・金曜日・土曜日 9:30～20:30、日曜日・祝日・休日 9:30～17:00", "木曜日・12月29日～1月3日"],
  "12": ["365日24時間"],
  "13": ["毎日 9:00～21:00", "年末年始"],
  "14": ["月曜日～金曜日 9:00～21:00、土曜日・日曜日 9:00～17:00", "祝日・年末年始"],
  "15": ["月曜日～金曜日 8:30～17:15", "祝日・年末年始"],
  "16": ["DV相談 8:30～22:00"],
  "17": ["月曜日～金曜日 9:00～17:00、土曜日・日曜日・祝日・年末年始 9:00～16:00"],
  "18": ["毎日 8:30～22:00"],
  "19": ["月曜日～金曜日 9:00～20:00", "祝日・年末年始"],
  "20": ["月曜日～金曜日 8:30～17:15", "祝日・12月29日～1月3日"],
  "21": ["月曜日～金曜日 9:00～18:00", "12月29日～1月3日"],
  "22": ["9:00～20:00", "祝日・年末年始"],
  "23": ["月曜日～金曜日 9:00～21:00、土曜日・日曜日 9:00～16:00", "祝日・年末年始・施設メンテナンス日"],
  "24": ["月曜日・火曜日・木曜日・金曜日 9:00～17:00、水曜日 9:00～20:00", "祝日・12月29日～1月3日"],
  "25": ["毎日 8:30～22:00"],
  "26": ["毎日 9:00～20:00"],
  "27": ["月曜日～金曜日 9:00～20:00、土曜日・日曜日 9:00～17:00", "祝日・年末年始"],
  "28": ["毎日 9:00～12:00・13:00～21:00（電話受付は20:30まで）。12月29日～1月3日は9:00～12:00・13:00～17:00（受付16:30まで）"],
  "29": ["月曜日～金曜日 9:00～20:00", "祝日・年末年始"],
  "30": ["9:00～21:30", "年末年始"],
  "31": ["月曜日～金曜日 8:30～17:15（緊急時は夜間・休日も対応）"],
  "32": ["月曜日～金曜日 8:30～17:00、土曜日・日曜日も電話相談あり（12:00～13:00を除く）"],
  "33": ["月曜日～金曜日 9:00～16:30", "祝日・年末年始"],
  "34": ["月曜日～金曜日 8:30～17:00", "祝日・年末年始"],
  "35": ["月曜日～金曜日 8:30～22:00、土曜日・日曜日 9:00～18:00", "祝日・年末年始"],
  "36": ["24時間対応（平日17:00～翌9:00、土曜日・日曜日・祝日・年末年始はコールセンター対応）"],
  "37": ["月曜日～土曜日 9:00～21:00", "祝日・年末年始"],
  "38": ["月曜日～金曜日 8:30～17:15、毎日 18:00～20:00", "祝日・年末年始"],
  "39": ["月曜日～金曜日 9:00～17:15・18:00～22:00、土曜日・日曜日・祝日 9:00～20:00", "年末年始"],
  "40": ["毎日 9:00～17:00", "年末年始"],
  "41": ["火曜日・木曜日～土曜日 9:00～18:00、水曜日 9:00～21:00、日曜日・祝日 9:00～16:30", "月曜日・12月29日～1月3日"],
  "42": ["月曜日～金曜日 9:00～17:45", "土曜日・日曜日・祝日・年末年始"],
  "43": ["平日 8:30～22:00、土曜日・日曜日・祝日 9:00～22:00"],
  "44": ["月曜日～金曜日 9:00～21:00、土曜日・日曜日・祝日 13:00～17:00・18:00～21:00", "年末年始"],
  "45": ["平日 9:00～20:30、土曜日・日曜日 9:00～15:00", "祝日・年末年始"],
  "46": ["月曜日～水曜日・金曜日 8:30～17:00、木曜日 8:30～20:00、日曜日 9:00～15:00"],
  "47": ["平日 8:30～17:15、土曜日・日曜日・祝日 8:30～12:00・13:00～16:30", "年末年始"],
};

const betterUrls: Record<string, string> = {
  "05": "https://www.pref.akita.lg.jp/pages/genre/13187",
  "09": "https://www.parti.jp/soudan/05.html",
  "10": "https://www.pref.gunma.jp/page/5984.html",
  "29": "https://www.pref.nara.jp/13200.htm",
  "30": "https://www.pref.wakayama.lg.jp/prefg/110502/soudan/d00216619.html",
  "32": "https://www.pref.shimane.lg.jp/life/jinken/danjo/dv/josei_soudan/dvsoudanmadoguchi.html",
  "34": "https://www.pref.hiroshima.lg.jp/soshiki/51/1169615351928.html",
  "35": "https://www.pref.yamaguchi.lg.jp/soshiki/37/17184.html",
  "36": "https://www.pref.tokushima.lg.jp/ippannokata/kurashi/jinken/5008218/",
  "37": "https://www.pref.kagawa.lg.jp/kenmin/sankaku/madoguchi/madoguchi.html",
  "38": "https://www.pref.ehime.jp/page/7029.html",
  "39": "https://www.pref.kochi.lg.jp/doc/about-cscw/",
  "41": "https://www.pref.saga.lg.jp/kiji0032889/index.html",
  "42": "https://www.pref.nagasaki.jp/bunrui/hukushi-hoken/fukushi/shakaifukushi/dv/",
};

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

const root = path.resolve(process.cwd());
const officesPath = path.join(root, "data/offices.csv");
const sourcesPath = path.join(root, "data/sources.csv");
const officeText = fs.readFileSync(officesPath, "utf8");
const officeLines = officeText.trimEnd().split(/\r?\n/);
const header = officeLines[0].split(",");
const sourceRows: string[][] = [];
let updated = 0;

for (let index = 1; index < officeLines.length; index += 1) {
  if (!officeLines[index].startsWith("prefecture-dv-center-")) continue;
  const row = parseCsv(officeLines[0] + "\n" + officeLines[index])[0];
  const code = row.id.slice(-2);
  const value = hours[code];
  if (!value) throw new Error(`受付時間が未定義です: ${row.id}`);
  row.openingHours = value[0];
  row.closedDays = value[1] ?? "";
  row.officialUrl = betterUrls[code] ?? row.officialUrl;
  row.sourceId = `source-prefecture-dv-center-${code}`;
  row.lastVerifiedAt = verifiedAt;
  row.verificationLevel = "human_verified";
  officeLines[index] = header.map((column) => csvCell(row[column] ?? "")).join(",");
  sourceRows.push([
    row.sourceId,
    `${row.name} 相談案内`,
    row.officialUrl,
    row.serviceArea.replace(/全域$/, ""),
    "official",
    "published",
    verifiedAt,
  ]);
  updated += 1;
}

if (updated !== 47) throw new Error(`更新対象が47件ではありません: ${updated}件`);
fs.writeFileSync(officesPath, officeLines.join("\n") + "\n");

const sourceText = fs.readFileSync(sourcesPath, "utf8");
const existingSourceIds = new Set(parseCsv(sourceText).map((row) => row.id));
const additions = sourceRows
  .filter(([id]) => !existingSourceIds.has(id))
  .map((row) => row.map(csvCell).join(","));
fs.writeFileSync(sourcesPath, sourceText.trimEnd() + (additions.length ? "\n" + additions.join("\n") : "") + "\n");

console.log(`DVセンター受付時間を更新: ${updated}件`);
console.log(`都道府県公式ページの出典を追加: ${additions.length}件`);
