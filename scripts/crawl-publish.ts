import { previewCandidatePublication, publishCandidate } from "../crawler/publisher";

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
  const municipalityCode = argument("municipality");
  const candidateId = argument("candidate");
  const actor = argument("actor");
  const confirmed = process.argv.includes("--confirm");
  if (!municipalityCode || !candidateId) {
    throw new Error("--municipality=082201 と --candidate=候補ID を指定してください。");
  }

  const preview = await previewCandidatePublication(municipalityCode, candidateId);
  console.log(JSON.stringify(preview, null, 2));
  if (!confirmed) {
    console.log(
      "\n差分確認のみです。公開する場合は --actor=確認者名 --confirm を追加してください。",
    );
    return;
  }
  if (!actor) throw new Error("--confirm使用時は--actor=確認者名が必要です。");
  const result = await publishCandidate(municipalityCode, candidateId, actor);
  console.log(`\n公開完了: ${result.preview.target} ${result.preview.entityId}`);
  console.log(`バックアップ: ${result.backupDirectory}`);
}

main().catch((error: unknown) => {
  console.error(`エラー: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
