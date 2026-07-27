import { readFile } from "node:fs/promises";
import { parseCsv } from "../lib/csv";

function duplicates(values: string[]) {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const value of values) (seen.has(value) ? dup : seen).add(value);
  return [...dup];
}
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function codeKey(value: string) { return value.replace(/\D/g, "").slice(0, 5); }

async function main() {
  const [nationwide, municipalities, offices, sources, monitorText] = await Promise.all([
    readFile("data/nationwide-municipalities.csv", "utf8").then(parseCsv),
    readFile("data/municipalities.csv", "utf8").then(parseCsv),
    readFile("data/offices.csv", "utf8").then(parseCsv),
    readFile("data/sources.csv", "utf8").then(parseCsv),
    readFile("data/source-monitor.json", "utf8"),
  ]);
  const monitor = JSON.parse(monitorText) as Array<{ sourceId: string; status: string; httpStatus: number; contentHash: string }>;
  const current = nationwide.filter((row) => row.entityType === "municipality" && row.lifecycleStatus === "current");
  const published = municipalities.filter((row) => row.status === "published");
  const publishedOffices = offices.filter((row) => row.status === "published");
  const officialSources = sources.filter((row) => row.status === "published" && row.sourceType === "official");
  const sourceIds = new Set(officialSources.map((row) => row.id));
  const monitorById = new Map(monitor.map((row) => [row.sourceId, row]));
  const currentByCode = new Map(current.map((row) => [codeKey(row.municipalityCode), row]));
  const portalByCode = new Map(published.map((row) => [codeKey(row.municipalityCode), row]));
  const officeByMunicipality = new Map<string, typeof offices>();
  for (const office of publishedOffices) {
    const group = officeByMunicipality.get(office.municipalityId) ?? [];
    group.push(office);
    officeByMunicipality.set(office.municipalityId, group);
  }

  assert(current.length === 1741, `全国マスター現行自治体数: ${current.length}`);
  assert(published.length === 1741, `公開ポータル自治体数: ${published.length}`);
  assert(new Set(current.map((row) => row.prefectureCode)).size === 47, "全国マスターが47都道府県を網羅していません");
  assert(new Set(published.map((row) => row.prefectureCode)).size === 47, "ポータルが47都道府県を網羅していません");
  assert(duplicates(current.map((row) => codeKey(row.municipalityCode))).length === 0, "全国マスターに自治体コード重複があります");
  assert(duplicates(published.map((row) => codeKey(row.municipalityCode))).length === 0, "ポータルに自治体コード重複があります");
  assert(duplicates(published.map((row) => row.id)).length === 0, "ポータルに自治体ID重複があります");
  assert(current.every((row) => row.officialUrl && /^https?:\/\//.test(row.officialUrl)), "全国マスターに公式URL未登録があります");
  assert(published.every((row) => row.supportLevel === "standard"), "standardでない公開自治体があります");
  assert(published.every((row) => currentByCode.has(codeKey(row.municipalityCode))), "全国マスターに存在しないポータル自治体があります");
  assert(current.every((row) => portalByCode.has(codeKey(row.municipalityCode))), "ポータル未登録の現行自治体があります");

  const routeFailures: string[] = [];
  const sourceFailures: string[] = [];
  for (const municipality of published) {
    const rows = officeByMunicipality.get(municipality.id) ?? [];
    const routeRows = {
      general: rows.filter((row) => row.id.endsWith("city-general") || row.plainName.includes("代表窓口") || row.plainName.includes("市役所・区役所")),
      selfReliance: rows.filter((row) => row.id.includes("self-reliance") || row.name.includes("自立相談") || row.plainName.includes("生活や仕事")),
      housingBenefit: rows.filter((row) => row.id.includes("housing-benefit") || row.categoryId === "rent"),
      publicAssistance: rows.filter((row) => row.id.includes("public-assistance") || row.plainName.includes("生活保護")),
    };
    const missing = Object.entries(routeRows).filter(([, matches]) => matches.length === 0).map(([role]) => role);
    if (missing.length) routeFailures.push(`${municipality.name}:${missing.join("/")}`);
    for (const row of Object.values(routeRows).flat()) {
      if (!row.officialUrl || !row.sourceId || !sourceIds.has(row.sourceId)) {
        sourceFailures.push(`${municipality.name}:${row.id}`);
      }
    }
  }
  assert(routeFailures.length === 0, `主要4導線不足: ${routeFailures.slice(0, 20).join("、")}`);
  assert(sourceFailures.length === 0, `主要導線の公式出典不足: ${sourceFailures.slice(0, 20).join("、")}`);

  const referencedSourceIds = new Set(publishedOffices.map((row) => row.sourceId).filter(Boolean));
  const missingSourceRows = [...referencedSourceIds].filter((id) => !sourceIds.has(id));
  assert(missingSourceRows.length === 0, `存在しない/非公式の出典参照: ${missingSourceRows.join(",")}`);
  const badMonitor = [...referencedSourceIds].filter((id) => {
    const item = monitorById.get(id);
    return item && (item.status === "failed" || !item.contentHash);
  });
  assert(badMonitor.length === 0, `監視失敗/ハッシュなしの利用中出典: ${badMonitor.join(",")}`);
  const monitoredPrefectures = new Set<string>();
  for (const municipality of published) {
    const used = (officeByMunicipality.get(municipality.id) ?? []).map((row) => row.sourceId);
    if (used.some((id) => monitorById.get(id)?.status !== "failed" && monitorById.get(id)?.contentHash)) {
      monitoredPrefectures.add(municipality.prefectureCode);
    }
  }
  assert(monitoredPrefectures.size === 47,
    `利用出典の監視成功が確認できない都道府県: ${[...new Set(published.map((row) => row.prefectureCode))].filter((code) => !monitoredPrefectures.has(code)).join(",")}`);

  const perPrefecture = [...new Set(current.map((row) => row.prefectureCode))].sort().map((code) => ({
    code,
    master: current.filter((row) => row.prefectureCode === code).length,
    portal: published.filter((row) => row.prefectureCode === code).length,
    standard: published.filter((row) => row.prefectureCode === code && row.supportLevel === "standard").length,
  }));
  assert(perPrefecture.every((row) => row.master === row.portal && row.portal === row.standard),
    `都道府県別不一致: ${perPrefecture.filter((row) => row.master !== row.portal || row.portal !== row.standard).map((row) => JSON.stringify(row)).join(",")}`);

  console.log(`完了監査OK`);
  console.log(`現行自治体: ${current.length} / ポータル公開: ${published.length} / standard: ${published.filter((row) => row.supportLevel === "standard").length}`);
  console.log(`47都道府県別件数一致: ${perPrefecture.length} / 主要4導線不足: ${routeFailures.length}`);
  console.log(`公開窓口: ${publishedOffices.length} / 利用中公式出典: ${referencedSourceIds.size} / 出典監視済み都道府県: ${monitoredPrefectures.size}`);
}
main().catch((error) => { console.error(`完了監査NG: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1; });
