import type { Office } from "@/lib/data/schemas";
import { isSensitiveCategory } from "@/lib/privacy";
import { officeContactType } from "@/lib/support-routing";

export function isIndexableCategoryPage(categoryId: string): boolean {
  return !isSensitiveCategory(categoryId);
}

export function isIndexableCategoryPrefecturePage(
  categoryId: string,
  indexableMunicipalityCount: number,
): boolean {
  return isIndexableCategoryPage(categoryId) && indexableMunicipalityCount > 0;
}

export function isIndexableSupportPage(
  offices: Office[],
  municipalityId: string,
  categoryId: string,
): boolean {
  if (!isIndexableCategoryPage(categoryId)) return false;
  return offices.some(
    (office) =>
      office.scope === "municipality" &&
      office.municipalityId === municipalityId &&
      office.categoryId === categoryId &&
      officeContactType(office) !== "representative" &&
      Boolean(office.sourceId && office.lastVerifiedAt) &&
      Boolean(office.phone || office.address || office.contactFormUrl || office.email),
  );
}
