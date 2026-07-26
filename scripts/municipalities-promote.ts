import path from "node:path";
import { writeFile } from "node:fs/promises";
import { assertSafeUrl } from "../crawler/security";
import { escapeCsv, readCsvFile, type CsvRow } from "../lib/csv";
import { municipalitySchema } from "../lib/data/schemas";

const headers = [
  "id", "prefectureCode", "municipalityCode", "name", "nameKana",
  "municipalityType", "officialUrl", "representativePhone",
  "supportLevel", "status", "lastVerifiedAt",
];

type VerifiedCandidate = {
  source: CsvRow;
  finalUrl: string;
};

function argument(name: string, fallback: string): string {
  return process.argv.find((value) => value.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;
}

function baseCode(value: string): string {
  return value.replace(/\D/g, "").slice(0, 5);
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#([0-9]+);/g, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 10)));
}

function visibleText(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  ).replace(/\s+/g, "");
}

async function fetchOfficialIdentity(item: CsvRow): Promise<VerifiedCandidate | null> {
  let current = await assertSafeUrl(item.officialUrl);
  for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
    const response = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "FukushiPortalMunicipalityVerifier/1.0",
      },
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) return null;
      current = await assertSafeUrl(new URL(location, current).href);
      continue;
    }
    if (!response.ok || !(response.headers.get("content-type") ?? "").toLowerCase().includes("html")) {
      return null;
    }
    const html = (await response.text()).slice(0, 600_000);
    const text = visibleText(html);
    const title = visibleText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
    const identifiesMunicipality = title.includes(item.name) || text.includes(item.name);
    const identifiesGovernment = /公式|ホームページ|市役所|区役所|町役場|村役場|自治体/.test(text)
      || current.hostname === "lg.jp"
      || current.hostname.endsWith(".lg.jp");
    if (!identifiesMunicipality || !identifiesGovernment) return null;
    return { source: item, finalUrl: current.href };
  }
  return null;
}

function roundRobin(candidates: CsvRow[]): CsvRow[] {
  const groups = new Map<string, CsvRow[]>();
  for (const candidate of candidates) {
    const group = groups.get(candidate.prefectureCode) ?? [];
    group.push(candidate);
    groups.set(candidate.prefectureCode, group);
  }
  const prefectureCodes = [...groups.keys()].sort();
  const result: CsvRow[] = [];
  let offset = 0;
  while (true) {
    let added = false;
    for (const prefectureCode of prefectureCodes) {
      const candidate = groups.get(prefectureCode)?.[offset];
      if (!candidate) continue;
      result.push(candidate);
      added = true;
    }
    if (!added) return result;
    offset += 1;
  }
}

async function main() {
  const count = Number.parseInt(argument("count", "300"), 10);
  const verifiedAt = argument("verified-at", new Date().toISOString().slice(0, 10));
  const concurrency = Math.max(1, Math.min(24, Number.parseInt(argument("concurrency", "12"), 10)));
  if (!Number.isInteger(count) || count < 1) throw new Error("--countには1以上の整数が必要です。");

  const dataDirectory = path.join(process.cwd(), "data");
  const municipalitiesPath = path.join(dataDirectory, "municipalities.csv");
  const [nationwide, existing] = await Promise.all([
    readCsvFile(path.join(dataDirectory, "nationwide-municipalities.csv")),
    readCsvFile(municipalitiesPath),
  ]);
  const existingCodes = new Set(existing.map((item) => baseCode(item.municipalityCode)));
  const existingIds = new Set(existing.map((item) => item.id));
  const eligible = nationwide
    .filter((item) =>
      item.entityType === "municipality"
      && item.lifecycleStatus === "current"
      && ["special_ward", "city", "town", "village"].includes(item.municipalityType)
      && Boolean(item.officialUrl)
      && !existingCodes.has(baseCode(item.municipalityCode))
      && !existingIds.has(item.id),
    )
    .sort((left, right) => left.municipalityCode.localeCompare(right.municipalityCode));
  const ordered = roundRobin(eligible);

  const verified: VerifiedCandidate[] = [];
  const failures: string[] = [];
  let cursor = 0;
  async function runner() {
    while (verified.length < count) {
      const index = cursor;
      cursor += 1;
      const candidate = ordered[index];
      if (!candidate) return;
      try {
        const result = await fetchOfficialIdentity(candidate);
        if (result && verified.length < count) verified.push(result);
        else if (!result) failures.push(`${candidate.municipalityCode}:${candidate.name}`);
      } catch (error) {
        failures.push(`${candidate.municipalityCode}:${candidate.name}:${error instanceof Error ? error.message : String(error)}`);
      }
      const checked = Math.min(cursor, ordered.length);
      if (checked % 50 === 0) {
        console.log(`到達確認 ${checked}/${ordered.length} / 採用 ${verified.length}/${count} / 除外 ${failures.length}`);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => runner()));
  if (verified.length !== count) {
    throw new Error(`公式サイトを確認できた自治体が${verified.length}件のため、要求された${count}件を追加しませんでした。`);
  }

  const selected: CsvRow[] = verified
    .slice(0, count)
    .sort((left, right) => left.source.municipalityCode.localeCompare(right.source.municipalityCode))
    .map(({ source }) => ({
      id: source.id,
      prefectureCode: source.prefectureCode,
      municipalityCode: source.municipalityCode,
      name: source.name,
      nameKana: source.nameKana,
      municipalityType: source.municipalityType,
      officialUrl: source.officialUrl,
      representativePhone: "",
      supportLevel: "basic",
      status: "published",
      lastVerifiedAt: verifiedAt,
    }));
  selected.forEach((item) => municipalitySchema.parse(item));

  const all = [...existing, ...selected];
  const duplicateCodes = all
    .map((item) => baseCode(item.municipalityCode))
    .filter((code, index, values) => values.indexOf(code) !== index);
  const duplicateIds = all.map((item) => item.id).filter((id, index, values) => values.indexOf(id) !== index);
  if (duplicateCodes.length || duplicateIds.length) {
    throw new Error(`重複を検出したため書き込みません（コード${duplicateCodes.length}件、ID${duplicateIds.length}件）。`);
  }

  const lines = [
    headers.join(","),
    ...all.map((row) => headers.map((header) => escapeCsv(row[header] ?? "")).join(",")),
  ];
  await writeFile(municipalitiesPath, `${lines.join("\n")}\n`, "utf8");

  const byPrefecture = new Map<string, number>();
  selected.forEach((item) => byPrefecture.set(item.prefectureCode, (byPrefecture.get(item.prefectureCode) ?? 0) + 1));
  console.log(`追加完了: ${selected.length}自治体 / 合計: ${all.length}自治体 / URL確認除外: ${failures.length}件`);
  console.log(`都道府県別追加数: ${[...byPrefecture.entries()].map(([code, value]) => `${code}:${value}`).join(" ")}`);
}

main().catch((error: unknown) => {
  console.error(`エラー: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
