import { previewCandidatePublication } from "../crawler/publisher";

function argument(name: string): string {
  return process.argv.slice(2)
    .find((item) => item.startsWith(`--${name}=`))
    ?.slice(name.length + 3)
    .trim() ?? "";
}

async function main() {
  const municipalityCode = argument("municipality");
  const candidateId = argument("candidate");
  if (!municipalityCode || !candidateId) {
    throw new Error("--municipality=082201 と --candidate=候補ID を指定してください。");
  }
  console.log(JSON.stringify(await previewCandidatePublication(municipalityCode, candidateId), null, 2));
}

main().catch((error: unknown) => {
  console.error(`エラー: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
