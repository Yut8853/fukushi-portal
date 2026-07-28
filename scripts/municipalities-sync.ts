import path from "node:path";
import { writeFile } from "node:fs/promises";
import * as cheerio from "cheerio";
import { escapeCsv, readCsvFile } from "../lib/csv";

type Row = {
  id: string;
  prefectureCode: string;
  municipalityCode: string;
  name: string;
  nameKana: string;
  municipalityType: string;
  entityType: string;
  parentMunicipality: string;
  lifecycleStatus: string;
  officialUrl: string;
  sourceUrl: string;
};

function checkDigit(code: string): string {
  const weights = [6, 5, 4, 3, 2];
  const remainder =
    code.split("").reduce((sum, digit, index) => sum + Number(digit) * weights[index], 0) % 11;
  const check = 11 - remainder;
  return `${code}${check >= 10 ? 0 : check}`;
}

function municipalityType(name: string, entityType: string): string {
  if (entityType === "administrative_ward") return "administrative_ward";
  if (name.endsWith("区")) return "special_ward";
  if (name.endsWith("市")) return "city";
  if (name.endsWith("町")) return "town";
  if (name.endsWith("村")) return "village";
  return "other";
}

async function main() {
  const existing = await readCsvFile(path.join(process.cwd(), "data", "municipalities.csv"));
  const urls = new Map(
    existing.map((item) => [item.municipalityCode.slice(0, 5), item.officialUrl]),
  );
  const rows: Row[] = [];
  for (let page = 1; page <= 96; page += 1) {
    const sourceUrl = `https://www.e-stat.go.jp/municipalities/cities/areacode?page=${page}`;
    const response = await fetch(sourceUrl, {
      headers: { "user-agent": "FukushiPortalMunicipalitySync/1.0" },
    });
    if (!response.ok) throw new Error(`e-Stat ${page + 1}ページ目: HTTP ${response.status}`);
    const $ = cheerio.load(await response.text());
    const codes = $("table.__fix tbody tr .htCode")
      .map((_, element) => $(element).text().trim())
      .get();
    const detailRows = $("table.stat-areacode-list-table:not(.__fix) tbody tr");
    detailRows.each((index, element) => {
      const code = codes[index];
      if (!/^\d{5}$/.test(code)) return;
      const parent = $(element).find(".parentCityNm").text().trim();
      const parentKana = $(element).find(".parentCityKana").text().trim();
      const self = $(element).find(".selfCityNm").text().trim();
      const selfKana = $(element).find(".selfCityKana").text().trim();
      const entityType =
        code === "13100"
          ? "aggregate"
          : Number(code) >= 1695 && Number(code) <= 1700
            ? "special_territory"
            : parent.endsWith("市") && self.endsWith("区")
              ? "administrative_ward"
              : "municipality";
      const name = self || parent;
      const kana = selfKana || parentKana;
      if (!name) return;
      rows.push({
        id: `jp-${code}`,
        prefectureCode: code.slice(0, 2),
        municipalityCode: checkDigit(code),
        name,
        nameKana: kana,
        municipalityType: municipalityType(name, entityType),
        entityType,
        parentMunicipality: entityType === "administrative_ward" ? parent : "",
        lifecycleStatus: "current",
        officialUrl: urls.get(code) ?? "",
        sourceUrl,
      });
    });
    if (page % 10 === 0) console.log(`e-Stat取得: ${page}/96ページ`);
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  const unique = [...new Map(rows.map((row) => [row.municipalityCode, row])).values()];
  const header = [
    "id",
    "prefectureCode",
    "municipalityCode",
    "name",
    "nameKana",
    "municipalityType",
    "entityType",
    "parentMunicipality",
    "lifecycleStatus",
    "officialUrl",
    "sourceUrl",
  ];
  const lines = [
    header.join(","),
    ...unique.map((row) => header.map((key) => escapeCsv(row[key as keyof Row])).join(",")),
  ];
  await writeFile(
    path.join(process.cwd(), "data", "nationwide-municipalities.csv"),
    `${lines.join("\n")}\n`,
    "utf8",
  );
  const municipalityCount = unique.filter((row) => row.entityType === "municipality").length;
  const wardCount = unique.filter((row) => row.entityType === "administrative_ward").length;
  const excludedCount = unique.length - municipalityCount - wardCount;
  console.log(
    `登録完了: 現行市区町村 ${municipalityCount} / 政令指定都市行政区 ${wardCount} / 集計・特別地域 ${excludedCount} / 合計 ${unique.length}`,
  );
  console.log(
    `公式URL登録済み: ${unique.filter((row) => row.officialUrl).length} / 未登録: ${unique.filter((row) => !row.officialUrl).length}`,
  );
}
main().catch((error: unknown) => {
  console.error(`エラー: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
