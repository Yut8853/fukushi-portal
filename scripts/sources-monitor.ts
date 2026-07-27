import { getPortalData } from "../lib/data/repository";
import { monitorSources } from "../crawler/source-monitor";

function argument(name: string): string {
  return (
    process.argv
      .slice(2)
      .find((item) => item.startsWith(`--${name}=`))
      ?.slice(name.length + 3)
      .trim() ?? ""
  );
}

async function main() {
  const all = process.argv.includes("--all");
  const requestedIds = argument("sources")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const limitText = argument("limit");
  const limit = limitText ? Number.parseInt(limitText, 10) : 0;
  if (!all && !requestedIds.length && !limit) {
    throw new Error(
      "安全のため --all、--sources=出典ID,出典ID、または --limit=件数を指定してください。",
    );
  }
  if (limit && (!Number.isInteger(limit) || limit < 1 || limit > 500)) {
    throw new Error("--limitは1〜500の整数で指定してください。");
  }

  const data = await getPortalData();
  const requested = new Set(requestedIds);
  let sources = data.sources.filter(
    (source) =>
      source.status === "published" && (all || !requested.size || requested.has(source.id)),
  );
  if (requested.size) {
    const missing = [...requested].filter((id) => !sources.some((source) => source.id === id));
    if (missing.length) throw new Error(`公開出典が見つかりません: ${missing.join(", ")}`);
  }
  if (limit) sources = sources.slice(0, limit);
  console.log(`監視対象: ${sources.length}件`);
  const results = await monitorSources(sources);
  const counts = new Map<string, number>();
  results.forEach((result) => counts.set(result.status, (counts.get(result.status) ?? 0) + 1));
  for (const [status, count] of [...counts.entries()].sort()) console.log(`${status}: ${count}`);
  results
    .filter((result) => result.status !== "ok")
    .forEach((result) => console.log(`  ${result.sourceId}: ${result.error || "内容変更を検出"}`));
  const failOnChange = process.argv.includes("--fail-on-change");
  if (
    results.some(
      (result) => result.status === "failed" || (failOnChange && result.status === "changed"),
    )
  ) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(`エラー: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
