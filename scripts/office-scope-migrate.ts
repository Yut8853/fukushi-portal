import { readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { parseCsv } from "../lib/csv";

const execFileAsync = promisify(execFile);

function appendScopeColumns(text: string): string {
  const records: string[] = [];
  let start = 0;
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === '"') {
      if (quoted && text[index + 1] === '"') index += 1;
      else quoted = !quoted;
    }
    if (!quoted && (text[index] === "\n" || text[index] === "\r")) {
      if (text[index] === "\r" && text[index + 1] === "\n") index += 1;
      records.push(text.slice(start, index + 1));
      start = index + 1;
    }
  }
  if (start < text.length) records.push(text.slice(start));
  return records
    .map((record, index) => {
      const ending = record.endsWith("\r\n") ? "\r\n" : record.endsWith("\n") ? "\n" : "";
      const body = ending ? record.slice(0, -ending.length) : record;
      if (!body) return record;
      return `${body},${index === 0 ? "scope,prefectureCode" : "municipality,"}${ending}`;
    })
    .join("");
}

async function main() {
  const officesPath = path.join(process.cwd(), "data", "offices.csv");
  const fromHead = process.argv.includes("--from-head");
  const text = fromHead
    ? (await execFileAsync("git", ["show", "HEAD:data/offices.csv"], { maxBuffer: 20_000_000 }))
        .stdout
    : await readFile(officesPath, "utf8");
  const rows = parseCsv(text);
  if (rows[0]?.scope !== undefined) {
    throw new Error("offices.csvには既にscope列があります。");
  }
  await writeFile(officesPath, appendScopeColumns(text), "utf8");
  console.log(`offices.csv: ${rows.length}件へscopeとprefectureCodeを追加しました。`);
}

main().catch((error: unknown) => {
  console.error(`エラー: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
