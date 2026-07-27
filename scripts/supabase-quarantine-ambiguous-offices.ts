import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { readCsvFile } from "../lib/csv";

loadEnvConfig(process.cwd());

async function main() {
  const apply = process.argv.includes("--apply");
  const offices = await readCsvFile(path.join(process.cwd(), "data", "offices.csv"));
  const ids = offices
    .filter((office) => office.status === "review_required")
    .map((office) => office.id);
  console.log(`review_required対象: ${ids.length}件`);
  if (!apply) return;

  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "") ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_URLとSUPABASE_SERVICE_ROLE_KEYが必要です。");
  }

  for (let offset = 0; offset < ids.length; offset += 50) {
    const batch = ids.slice(offset, offset + 50);
    const filter = encodeURIComponent(`(${batch.map((id) => `"${id}"`).join(",")})`);
    const response = await fetch(`${url}/rest/v1/offices?id=in.${filter}`, {
      method: "PATCH",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        "content-type": "application/json",
        prefer: "return=minimal",
      },
      body: JSON.stringify({ status: "review_required" }),
    });
    if (!response.ok) {
      throw new Error(`Supabase更新失敗: HTTP ${response.status} ${await response.text()}`);
    }
  }
  console.log("Supabaseの対象窓口をreview_requiredへ更新しました。");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
