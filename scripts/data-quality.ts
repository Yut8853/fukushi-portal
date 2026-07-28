import path from "node:path";
import { getPortalData } from "../lib/data/repository";
import {
  isVerificationExpired,
  missingStandardOfficeRoles,
  officeMissingFields,
  standardOfficeRoleLabels,
  verificationAgeDays,
  verificationMaxAgeDays,
  VERIFICATION_MAX_AGE_DAYS,
  VERIFICATION_WARNING_DAYS,
} from "../lib/data/quality";

async function main() {
  const data = await getPortalData(path.join(process.cwd(), "data"));
  const standardMunicipalities = data.municipalities.filter((item) =>
    item.status === "published" && item.supportLevel !== "basic",
  );
  const roleErrors: string[] = [];
  for (const municipality of standardMunicipalities) {
    const offices = data.offices.filter((item) => item.municipalityId === municipality.id);
    const missing = missingStandardOfficeRoles(offices);
    if (missing.length) {
      roleErrors.push(
        `${municipality.name}: ${missing.map((role) => standardOfficeRoleLabels[role]).join("・")}`,
      );
    }
  }

  const publishedOffices = data.offices.filter((item) => item.status === "published");
  const fieldCounts = new Map<string, number>();
  for (const office of publishedOffices) {
    for (const field of officeMissingFields(office)) {
      fieldCounts.set(field, (fieldCounts.get(field) ?? 0) + 1);
    }
  }

  const dated = [
    ...data.municipalities.map(({ status, lastVerifiedAt }) => ({ status, lastVerifiedAt, verificationLevel: "" as const })),
    ...data.offices.map(({ status, lastVerifiedAt, verificationLevel }) => ({ status, lastVerifiedAt, verificationLevel })),
    ...data.programs.map(({ status, lastVerifiedAt }) => ({ status, lastVerifiedAt, verificationLevel: "" as const })),
    ...data.sources.map(({ status, lastVerifiedAt }) => ({ status, lastVerifiedAt, verificationLevel: "" as const })),
  ].filter((item) => item.status === "published");
  const expired = dated.filter((item) =>
    isVerificationExpired(
      item.lastVerifiedAt,
      Date.now(),
      verificationMaxAgeDays(item.verificationLevel),
    ),
  );
  const dueSoon = dated.filter((item) => {
    const age = verificationAgeDays(item.lastVerifiedAt);
    const maxAge = verificationMaxAgeDays(item.verificationLevel);
    return age !== null
      && age <= maxAge
      && age > maxAge - VERIFICATION_WARNING_DAYS;
  });

  console.log(`standard監査: ${standardMunicipalities.length}自治体`);
  console.log(`主要4導線不足: ${roleErrors.length}自治体`);
  roleErrors.forEach((message) => console.log(`  エラー: ${message}`));
  console.log(`\n公開窓口: ${publishedOffices.length}件`);
  for (const [field, count] of [...fieldCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${field}未登録: ${count}件`);
  }
  console.log(`\n確認期限: 公式一括取込365日 / 個別確認・利用者報告${VERIFICATION_MAX_AGE_DAYS}日`);
  console.log(`  期限切れ: ${expired.length}件`);
  console.log(`  30日以内に期限: ${dueSoon.length}件`);

  if (roleErrors.length) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(`エラー: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
