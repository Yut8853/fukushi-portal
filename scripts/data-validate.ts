import path from "node:path";
import { readCsvFile } from "../lib/csv";
import {
  categorySchema, municipalityProgramSchema, municipalitySchema, officeSchema,
  prefectureSchema, programSchema, sourceSchema,
} from "../lib/data/schemas";
import type { ZodType } from "zod";

type Finding = { file: string; row: number; message: string };
const errors: Finding[] = [];
const warnings: Finding[] = [];
const dataDir = path.join(process.cwd(), "data");

async function validateRows<T>(filename: string, schema: ZodType<T>): Promise<T[]> {
  const rows = await readCsvFile(path.join(dataDir, filename));
  const valid: T[] = [];
  rows.forEach((row, index) => {
    const result = schema.safeParse(row);
    if (result.success) valid.push(result.data);
    else {
      result.error.issues.forEach((issue) => {
        errors.push({ file: filename, row: index + 2, message: `${issue.path.join(".") || "行"}: ${issue.message}` });
      });
    }
  });
  return valid;
}

function duplicate(values: { value: string; row: number }[], label: string, file: string) {
  const seen = new Set<string>();
  values.forEach(({ value, row }) => {
    if (seen.has(value)) errors.push({ file, row, message: `${label}「${value}」が重複しています。` });
    seen.add(value);
  });
}

function missingRef(file: string, row: number, label: string, id: string, available: Set<string>) {
  if (id && !available.has(id)) errors.push({ file, row, message: `存在しない${label}「${id}」を参照しています。` });
}

async function main() {
const nationwide = await readCsvFile(path.join(dataDir, "nationwide-municipalities.csv")).catch(() => []);
const [prefectures, categories, municipalities, offices, programs, municipalityPrograms, sources] =
  await Promise.all([
    validateRows("prefectures.csv", prefectureSchema),
    validateRows("categories.csv", categorySchema),
    validateRows("municipalities.csv", municipalitySchema),
    validateRows("offices.csv", officeSchema),
    validateRows("programs.csv", programSchema),
    validateRows("municipality-programs.csv", municipalityProgramSchema),
    validateRows("sources.csv", sourceSchema),
  ]);

const prefectureCodes = new Set(prefectures.map((item) => item.code));
const categoryIds = new Set(categories.map((item) => item.id));
const municipalityIds = new Set(municipalities.map((item) => item.id));
const officeIds = new Set(offices.map((item) => item.id));
const programIds = new Set(programs.map((item) => item.id));
const sourceIds = new Set(sources.map((item) => item.id));
const phonePattern = /^(?:\+81[- ]?|0)\d{1,4}[- ]?\d{1,4}[- ]?\d{3,4}$/;

duplicate(municipalities.map((item, index) => ({ value: item.municipalityCode, row: index + 2 })), "自治体コード", "municipalities.csv");
duplicate(municipalities.map((item, index) => ({ value: `${item.prefectureCode}:${item.name}`, row: index + 2 })), "都道府県内の自治体名", "municipalities.csv");

municipalities.forEach((item, index) => {
  const row = index + 2;
  missingRef("municipalities.csv", row, "都道府県コード", item.prefectureCode, prefectureCodes);
  if (item.representativePhone && !phonePattern.test(item.representativePhone)) {
    errors.push({ file: "municipalities.csv", row, message: `代表電話「${item.representativePhone}」の形式が不正です。` });
  }
  if (item.status === "published") {
    if (!item.officialUrl) errors.push({ file: "municipalities.csv", row, message: "公開自治体には公式URLが必要です。" });
    if (!item.lastVerifiedAt) errors.push({ file: "municipalities.csv", row, message: "公開自治体には最終確認日が必要です。" });
  }
});

if (nationwide.length) {
  duplicate(nationwide.map((item, index) => ({ value: item.municipalityCode, row: index + 2 })), "全国自治体コード", "nationwide-municipalities.csv");
  nationwide.forEach((item, index) => {
    if (!/^\d{6}$/.test(item.municipalityCode)) errors.push({ file: "nationwide-municipalities.csv", row: index + 2, message: "自治体コードは検査数字を含む6桁である必要があります。" });
    missingRef("nationwide-municipalities.csv", index + 2, "都道府県コード", item.prefectureCode, prefectureCodes);
    if (!["municipality", "administrative_ward", "special_territory", "aggregate"].includes(item.entityType)) {
      errors.push({ file: "nationwide-municipalities.csv", row: index + 2, message: `entityType「${item.entityType}」が不正です。` });
    }
  });
  const current = nationwide.filter((item) => item.entityType === "municipality" && item.lifecycleStatus === "current").length;
  const wards = nationwide.filter((item) => item.entityType === "administrative_ward").length;
  if (current !== 1741) errors.push({ file: "nationwide-municipalities.csv", row: 1, message: `現行市区町村は1741件である必要があります（現在${current}件）。` });
  if (wards !== 171) warnings.push({ file: "nationwide-municipalities.csv", row: 1, message: `政令指定都市行政区は171件ではありません（現在${wards}件）。` });
  const missingOfficialUrls = nationwide.filter((item) => item.entityType === "municipality" && !item.officialUrl).length;
  if (missingOfficialUrls) warnings.push({ file: "nationwide-municipalities.csv", row: 1, message: `現行市区町村の公式URLが${missingOfficialUrls}件未登録です。クロール対象には入りません。` });
}

offices.forEach((item, index) => {
  const row = index + 2;
  missingRef("offices.csv", row, "自治体ID", item.municipalityId, municipalityIds);
  missingRef("offices.csv", row, "分類ID", item.categoryId, categoryIds);
  missingRef("offices.csv", row, "出典ID", item.sourceId, sourceIds);
  for (const [label, value] of [["電話", item.phone], ["FAX", item.fax]] as const) {
    if (value && !phonePattern.test(value)) errors.push({ file: "offices.csv", row, message: `${label}「${value}」の形式が不正です。` });
  }
  if (item.status === "published") {
    if (!item.sourceId) errors.push({ file: "offices.csv", row, message: "公開窓口には出典IDが必要です。" });
    if (!item.lastVerifiedAt) errors.push({ file: "offices.csv", row, message: "公開窓口には最終確認日が必要です。" });
    if (!item.phone && !item.officialUrl && !item.contactFormUrl && !item.email) {
      errors.push({ file: "offices.csv", row, message: "公開窓口には少なくとも1つの連絡手段が必要です。" });
    }
  }
});

programs.forEach((item, index) => {
  const row = index + 2;
  missingRef("programs.csv", row, "分類ID", item.categoryId, categoryIds);
  missingRef("programs.csv", row, "自治体ID", item.municipalityId, municipalityIds);
  missingRef("programs.csv", row, "窓口ID", item.officeId, officeIds);
  missingRef("programs.csv", row, "出典ID", item.sourceId, sourceIds);
  if (item.scope === "municipality" && !item.municipalityId) {
    errors.push({ file: "programs.csv", row, message: "自治体制度には自治体IDが必要です。" });
  }
  if (item.status === "published") {
    if (!item.sourceId) errors.push({ file: "programs.csv", row, message: "公開制度には出典IDが必要です。" });
    if (!item.lastVerifiedAt) errors.push({ file: "programs.csv", row, message: "公開制度には最終確認日が必要です。" });
  }
});

municipalityPrograms.forEach((item, index) => {
  const row = index + 2;
  missingRef("municipality-programs.csv", row, "自治体ID", item.municipalityId, municipalityIds);
  missingRef("municipality-programs.csv", row, "制度ID", item.programId, programIds);
  missingRef("municipality-programs.csv", row, "窓口ID", item.officeId, officeIds);
  missingRef("municipality-programs.csv", row, "出典ID", item.sourceId, sourceIds);
  if (item.status === "published" && (!item.sourceId || !item.lastVerifiedAt)) {
    errors.push({ file: "municipality-programs.csv", row, message: "公開自治体制度には出典IDと最終確認日が必要です。" });
  }
});

for (const [filename, items] of [
  ["municipalities.csv", municipalities],
  ["offices.csv", offices],
  ["programs.csv", programs],
  ["sources.csv", sources],
] as const) {
  items.forEach((item, index) => {
    if (item.lastVerifiedAt) {
      const age = Date.now() - new Date(`${item.lastVerifiedAt}T00:00:00Z`).getTime();
      if (age > 365 * 86_400_000) warnings.push({ file: filename, row: index + 2, message: "最終確認日から1年以上経過しています。" });
    }
  });
}

function printFindings(title: string, findings: Finding[]) {
  console.log(`\n${title}: ${findings.length}件`);
  findings.forEach((finding) => console.log(`  ${finding.file}:${finding.row} ${finding.message}`));
}
printFindings("エラー", errors);
printFindings("警告", warnings);
console.log(`\n検証対象: ${prefectures.length}都道府県 / ポータル${municipalities.length}自治体 / 全国データ${nationwide.length}団体 / ${offices.length}窓口 / ${programs.length}制度`);
process.exitCode = errors.length > 0 ? 1 : 0;
}

main().catch((error: unknown) => {
  console.error(`エラー: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
