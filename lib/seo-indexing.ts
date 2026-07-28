import type { Office } from "@/lib/data/schemas";
import { officeContactType } from "@/lib/support-routing";

export function isIndexableSupportPage(
  offices: Office[],
  municipalityId: string,
  categoryId: string,
): boolean {
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
