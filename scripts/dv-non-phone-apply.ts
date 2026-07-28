import fs from "node:fs";
import path from "node:path";
import { parseCsv } from "../lib/csv";

type Alternative = {
  email?: string;
  fax?: string;
  contactFormUrl?: string;
  method: "メール" | "FAX" | "SNS";
};

const alternatives: Record<string, Alternative> = {
  "01": {
    contactFormUrl: "https://www.harp.lg.jp/SksJuminWeb/EntryForm?id=lbJlxGHP",
    method: "SNS",
  },
  "09": {
    contactFormUrl: "https://www.pref.tochigi.lg.jp/c07/joseishien/linesoudan.html",
    method: "SNS",
  },
  "11": {
    contactFormUrl: "https://saitama.sodan.chat/",
    method: "SNS",
  },
  "12": {
    contactFormUrl: "https://www.pref.chiba.lg.jp/dankyou/dv/soudan.html",
    method: "SNS",
  },
  "13": {
    contactFormUrl: "https://www.fukushi.metro.tokyo.lg.jp/kiban/madoguchi/josei_soudan",
    method: "SNS",
  },
  "14": {
    contactFormUrl: "https://www.pref.kanagawa.jp/docs/m8u/joseisoudan.html",
    method: "SNS",
  },
  "16": {
    contactFormUrl: "https://page.line.me/toyama_zyosei",
    method: "SNS",
  },
  "24": { email: "josou@pref.mie.lg.jp", method: "メール" },
  "27": { fax: "06-6940-0075", method: "FAX" },
  "30": { email: "e1105021@pref.wakayama.lg.jp", method: "メール" },
  "31": { email: "fsc_jyoseisodan@pref.tottori.lg.jp", method: "メール" },
};

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

const officesPath = path.join(process.cwd(), "data/offices.csv");
const text = fs.readFileSync(officesPath, "utf8");
const lines = text.trimEnd().split(/\r?\n/);
const header = lines[0].split(",");
let updated = 0;

for (let index = 1; index < lines.length; index += 1) {
  if (!lines[index].startsWith("prefecture-dv-center-")) continue;
  const row = parseCsv(lines[0] + "\n" + lines[index])[0];
  const code = row.id.slice(-2);
  const alternative = alternatives[code];
  if (!alternative) continue;
  row.email = alternative.email ?? row.email;
  row.fax = alternative.fax ?? row.fax;
  row.contactFormUrl = alternative.contactFormUrl ?? row.contactFormUrl;
  const methods = new Set(row.availableMethods.split("・").filter(Boolean));
  methods.add(alternative.method);
  row.availableMethods = [...methods].join("・");
  row.lastVerifiedAt = "2026-07-28";
  row.verificationLevel = "human_verified";
  lines[index] = header.map((column) => csvCell(row[column] ?? "")).join(",");
  updated += 1;
}

if (updated !== Object.keys(alternatives).length) {
  throw new Error(`更新数が一致しません: ${updated}/${Object.keys(alternatives).length}`);
}
fs.writeFileSync(officesPath, lines.join("\n") + "\n");
console.log(`DV窓口の非通話経路を更新: ${updated}件`);
