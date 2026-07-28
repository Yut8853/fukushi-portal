import { loadEnvConfig } from "@next/env";
import { getCsvPortalData } from "../lib/data/repository";

loadEnvConfig(process.cwd());

type DatabaseValue = string | number | boolean | null;
type DatabaseRow = Record<string, DatabaseValue>;

const nullableKeys = new Set([
  "lastVerifiedAt",
  "reservationRequired",
  "sourceId",
  "officeId",
  "municipalityId",
  "prefectureCode",
]);

function toSnakeCase(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function databaseRow(value: object): DatabaseRow {
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      toSnakeCase(key),
      nullableKeys.has(key) && item === "" ? null : (item as DatabaseValue),
    ]),
  );
}

async function upsert(
  table: string,
  rows: DatabaseRow[],
  url: string,
  serviceRoleKey: string,
  conflictColumn = "id",
): Promise<void> {
  for (let offset = 0; offset < rows.length; offset += 500) {
    const batch = rows.slice(offset, offset + 500);
    const response = await fetch(`${url}/rest/v1/${table}?on_conflict=${conflictColumn}`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        "content-type": "application/json",
        prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(batch),
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`${table}投入失敗: HTTP ${response.status} ${detail.slice(0, 500)}`);
    }
  }
  console.log(`${table}: ${rows.length}件`);
}

async function main() {
  const apply = process.argv.includes("--apply");
  const data = await getCsvPortalData();
  const tables: Array<[string, object[], string?]> = [
    ["prefectures", data.prefectures, "code"],
    ["categories", data.categories],
    ["municipalities", data.municipalities],
    ["sources", data.sources],
    ["offices", data.offices],
    ["programs", data.programs],
    ["municipality_programs", data.municipalityPrograms],
  ];
  console.log(tables.map(([table, rows]) => `${table}:${rows.length}`).join(" / "));
  if (!apply) {
    console.log("ドライランです。DBへ投入する場合は --apply を付けてください。");
    return;
  }

  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "") ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !serviceRoleKey) {
    throw new Error("--applyにはSUPABASE_URLとSUPABASE_SERVICE_ROLE_KEYが必要です。");
  }
  for (const [table, rows, conflictColumn] of tables) {
    await upsert(table, rows.map(databaseRow), url, serviceRoleKey, conflictColumn);
  }
}

main().catch((error: unknown) => {
  console.error(`エラー: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
