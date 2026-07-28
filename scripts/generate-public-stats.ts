import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getPublicPortalData } from "@/lib/data/repository";
import {
  buildOfficeIndex,
  hasOnlyRepresentativeLocalValue,
  selectedOfficesFor,
} from "@/lib/seo-analysis";
import { isIndexableSupportPage } from "@/lib/seo-indexing";

const checkOnly = process.argv.includes("--check");
const root = process.cwd();
const statsPath = path.join(root, "data/generated/public-stats.json");
const readmePath = path.join(root, "README.md");

async function calculate() {
  const data = await getPublicPortalData();
  const index = buildOfficeIndex(data.offices);
  let indexablePages = 0;
  let noindexPages = 0;
  let representativeOnlyPages = 0;

  for (const municipality of data.municipalities) {
    for (const category of data.categories) {
      const selected = selectedOfficesFor(index, municipality, category.id);
      if (isIndexableSupportPage(selected, municipality.id, category.id)) indexablePages += 1;
      else noindexPages += 1;
      if (hasOnlyRepresentativeLocalValue(index, municipality, category.id)) {
        representativeOnlyPages += 1;
      }
    }
  }

  const dataGeneratedAt =
    [...data.municipalities, ...data.offices, ...data.programs, ...data.sources]
      .map((item) => item.lastVerifiedAt)
      .filter(Boolean)
      .sort()
      .at(-1) || "";
  const sourceCommit = execFileSync("git", ["rev-parse", "--short=12", "HEAD"], {
    encoding: "utf8",
  }).trim();

  return {
    schemaVersion: 1,
    publishedOffices: data.offices.length,
    indexablePages,
    noindexPages,
    localSpecialistPages: indexablePages,
    representativeOnlyPages,
    sourceCommit,
    dataGeneratedAt,
  };
}

function updateReadme(readme: string, stats: Awaited<ReturnType<typeof calculate>>): string {
  const replacements: Array<[RegExp, string]> = [
    [
      /^\| 公開窓口.*$/m,
      `| 公開窓口                  |          ${stats.publishedOffices.toLocaleString("ja-JP")} |`,
    ],
    [
      /^\| インデックス対象ページ.*$/m,
      `| インデックス対象ページ    |          ${stats.indexablePages.toLocaleString("ja-JP")} |`,
    ],
    [
      /^\| noindex・followページ.*$/m,
      `| noindex・followページ     |         ${stats.noindexPages.toLocaleString("ja-JP")} |`,
    ],
    [
      /^\| 地域固有専門窓口ページ.*$/m,
      `| 地域固有専門窓口ページ    |          ${stats.localSpecialistPages.toLocaleString("ja-JP")} |`,
    ],
    [
      /^\| 自治体固有情報が代表のみ.*$/m,
      `| 自治体固有情報が代表のみ  |         ${stats.representativeOnlyPages.toLocaleString("ja-JP")} |`,
    ],
    [
      /\d{4}-\d{2}-\d{2}時点では、[\d,]+ページが`index`、[\d,]+ページが`noindex, follow`です。/,
      `${stats.dataGeneratedAt}時点では、${stats.indexablePages.toLocaleString("ja-JP")}ページが\`index\`、${stats.noindexPages.toLocaleString("ja-JP")}ページが\`noindex, follow\`です。`,
    ],
  ];
  return replacements.reduce((value, [pattern, replacement]) => {
    if (!pattern.test(value)) throw new Error(`READMEの自動更新対象が見つかりません: ${pattern}`);
    return value.replace(pattern, replacement);
  }, readme);
}

async function main() {
  const calculated = await calculate();
  const current = JSON.parse(readFileSync(statsPath, "utf8")) as typeof calculated;
  const comparableKeys: Array<keyof typeof calculated> = [
    "schemaVersion",
    "publishedOffices",
    "indexablePages",
    "noindexPages",
    "localSpecialistPages",
    "representativeOnlyPages",
    "dataGeneratedAt",
  ];
  const mismatches = comparableKeys.filter((key) => current[key] !== calculated[key]);
  const expectedReadme = updateReadme(readFileSync(readmePath, "utf8"), calculated);

  if (checkOnly) {
    if (mismatches.length) {
      throw new Error(`public-stats.jsonが古いです: ${mismatches.join(", ")}`);
    }
    if (expectedReadme !== readFileSync(readmePath, "utf8")) {
      throw new Error("READMEの公開件数がpublic-stats.jsonと一致しません。");
    }
    console.log(
      `公開統計同期OK: index ${calculated.indexablePages} / noindex ${calculated.noindexPages}`,
    );
    return;
  }

  writeFileSync(statsPath, `${JSON.stringify(calculated, null, 2)}\n`);
  writeFileSync(readmePath, expectedReadme);
  console.log(`公開統計を更新: ${statsPath}`);
}

void main();
