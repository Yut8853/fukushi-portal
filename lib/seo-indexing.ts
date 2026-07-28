import type { Office } from "@/lib/data/schemas";
import { officeContactType } from "@/lib/support-routing";

export function isIndexableSupportPage(
  offices: Office[],
  municipalityId: string,
  categoryId: string,
): boolean {
  if (offices.length >= 3) return true;
  return offices.some(
    (office) =>
      office.scope === "municipality" &&
      office.municipalityId === municipalityId &&
      office.categoryId === categoryId &&
      officeContactType(office) !== "representative",
  );
}
