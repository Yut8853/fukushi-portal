import type { Municipality, Office } from "./schemas";

export const VERIFICATION_MAX_AGE_DAYS = 180;
export const PRIMARY_SOURCE_VERIFICATION_MAX_AGE_DAYS = 365;
export const VERIFICATION_WARNING_DAYS = 30;

const millisecondsPerDay = 86_400_000;

export type StandardOfficeRole = "general" | "selfReliance" | "housingBenefit" | "publicAssistance";

export const standardOfficeRoleLabels: Record<StandardOfficeRole, string> = {
  general: "市役所・代表窓口",
  selfReliance: "生活困窮者自立相談",
  housingBenefit: "住居確保給付金",
  publicAssistance: "生活保護相談・申請",
};

export function verificationAgeDays(date: string, now = Date.now()): number | null {
  if (!date) return null;
  const verifiedAt = new Date(`${date}T00:00:00Z`).getTime();
  if (!Number.isFinite(verifiedAt)) return null;
  return Math.max(0, Math.floor((now - verifiedAt) / millisecondsPerDay));
}

export function verificationMaxAgeDays(
  level: Office["verificationLevel"] | "" | undefined,
): number {
  return level === "primary_source_import"
    ? PRIMARY_SOURCE_VERIFICATION_MAX_AGE_DAYS
    : VERIFICATION_MAX_AGE_DAYS;
}

export function isVerificationExpired(
  date: string,
  now = Date.now(),
  maxAgeDays = VERIFICATION_MAX_AGE_DAYS,
): boolean {
  const age = verificationAgeDays(date, now);
  return age === null || age > maxAgeDays;
}

export function officeRoles(offices: Office[]): Record<StandardOfficeRole, boolean> {
  const published = offices.filter((office) => office.status === "published");
  return {
    general: published.some((office) =>
      office.id.endsWith("city-general")
      || office.plainName.includes("代表窓口")
      || office.plainName.includes("市役所・区役所"),
    ),
    selfReliance: published.some((office) =>
      office.id.includes("self-reliance")
      || office.name.includes("自立相談")
      || office.plainName.includes("生活や仕事"),
    ),
    housingBenefit: published.some((office) =>
      office.id.includes("housing-benefit")
      || office.categoryId === "rent",
    ),
    publicAssistance: published.some((office) =>
      office.id.includes("public-assistance")
      || office.plainName.includes("生活保護"),
    ),
  };
}

export function missingStandardOfficeRoles(offices: Office[]): StandardOfficeRole[] {
  const roles = officeRoles(offices);
  return (Object.keys(roles) as StandardOfficeRole[]).filter((role) => !roles[role]);
}

export function officeMissingFields(office: Office): string[] {
  return [
    !office.department && "担当部署",
    !office.description && "説明",
    !office.phone && "電話番号",
    !office.address && "住所",
    !office.openingHours && "受付時間",
    !office.closedDays && "休業日",
    !office.availableMethods && "対応方法",
    !office.sourceId && "出典",
    !office.lastVerifiedAt && "最終確認日",
  ].filter((value): value is string => Boolean(value));
}

export function municipalityMissingCount(municipality: Municipality, offices: Office[]): number {
  const baseMissing = [
    !municipality.nameKana,
    !municipality.officialUrl,
    !municipality.representativePhone,
    !municipality.lastVerifiedAt,
  ].filter(Boolean).length;
  const officeMissing = offices
    .filter((office) => office.status === "published")
    .reduce((count, office) => count + officeMissingFields(office).length, 0);
  const roleMissing = municipality.supportLevel === "basic"
    ? 0
    : missingStandardOfficeRoles(offices).length;
  return baseMissing + officeMissing + roleMissing;
}
