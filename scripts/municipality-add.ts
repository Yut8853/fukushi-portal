import path from "node:path";
import { appendFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { escapeCsv, readCsvFile } from "../lib/csv";
import { municipalitySchema, municipalityTypeSchema, supportLevelSchema } from "../lib/data/schemas";

async function main() {
 const rl = createInterface({ input, output });
 const dataDir = path.join(process.cwd(), "data");
 const prefectures = await readCsvFile(path.join(dataDir, "prefectures.csv"));
 const municipalities = await readCsvFile(path.join(dataDir, "municipalities.csv"));
 try {
  console.log("自治体を追加します（Ctrl+Cで中止）");
  console.log(prefectures.map((item) => `${item.code}:${item.name}`).join(" / "));
  const prefectureCode = (await rl.question("都道府県コード（2桁）: ")).trim();
  const prefecture = prefectures.find((item) => item.code === prefectureCode);
  if (!prefecture) throw new Error(`都道府県コード「${prefectureCode}」は存在しません。`);
  const name = (await rl.question("自治体名: ")).trim();
  const nameKana = (await rl.question("自治体名かな: ")).trim();
  const municipalityCode = (await rl.question("自治体コード（5〜6桁）: ")).trim();
  if (municipalities.some((item) => item.municipalityCode === municipalityCode)) {
    throw new Error(`自治体コード「${municipalityCode}」は既に登録されています。追加しませんでした。`);
  }
  if (municipalities.some((item) => item.prefectureCode === prefectureCode && item.name === name)) {
    throw new Error(`${prefecture.name}の「${name}」は既に登録されています。追加しませんでした。`);
  }
  const municipalityType = (await rl.question("自治体種別（special_ward/city/town/village）: ")).trim();
  const officialUrl = (await rl.question("公式サイトURL（未確認なら空欄）: ")).trim();
  const representativePhone = (await rl.question("代表電話（未確認なら空欄）: ")).trim();
  const supportLevel = (await rl.question("対応レベル（basic/standard/detailed）: ")).trim();
  const idDefault = `${prefectureCode}-${municipalityCode}`;
  const id = (await rl.question(`ID（空欄で ${idDefault}）: `)).trim() || idDefault;
  const candidate = {
    id, prefectureCode, municipalityCode, name, nameKana, municipalityType,
    officialUrl, representativePhone, supportLevel, status: "draft", lastVerifiedAt: "",
  };
  const result = municipalitySchema.safeParse(candidate);
  if (!municipalityTypeSchema.safeParse(municipalityType).success || !supportLevelSchema.safeParse(supportLevel).success || !result.success) {
    const detail = result.success ? "入力値を確認してください。" : result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`入力内容が不正です: ${detail}`);
  }
  const columns = [
    result.data.id, result.data.prefectureCode, result.data.municipalityCode, result.data.name,
    result.data.nameKana, result.data.municipalityType, result.data.officialUrl,
    result.data.representativePhone, result.data.supportLevel, result.data.status, result.data.lastVerifiedAt,
  ];
  await appendFile(path.join(dataDir, "municipalities.csv"), `${columns.map(escapeCsv).join(",")}\n`, "utf8");
  console.log(`「${prefecture.name} ${name}」をdraft状態で追加しました。`);
 } catch (error) {
  console.error(`警告: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
 } finally {
  rl.close();
 }
}

main().catch((error: unknown) => {
  console.error(`警告: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
