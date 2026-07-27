import type { Office } from "@/lib/data/schemas";

export type OfficeContactType = "direct" | "self-reliance" | "representative";

const TRANSFER_TARGETS: Record<string, string> = {
  food: "生活困窮者自立相談支援の担当",
  housing: "生活困窮者自立相談支援の担当",
  rent: "住居確保給付金の担当",
  utilities: "水道料金の相談担当",
  money: "生活保護の担当",
  medical: "医療費の相談担当",
  work: "生活困窮者自立相談支援の担当",
  debt: "生活困窮者自立相談支援の担当",
  violence: "DV相談の担当",
  children: "子育て・ひとり親支援の担当",
  mental: "保健・こころの相談担当",
  disability: "障害福祉の担当",
  care: "介護保険の担当",
  unknown: "生活困窮者自立相談支援の担当",
};

export const SELF_RELIANCE_FIRST_CATEGORIES = new Set([
  "food", "housing", "utilities", "work", "debt", "unknown",
]);

export function officeContactType(
  office: Pick<Office, "id" | "categoryId" | "plainName" | "phone" | "contactType">,
  representativePhone = "",
): OfficeContactType {
  if (office.contactType) return office.contactType;
  const phone = office.phone.replace(/\D/g, "");
  const representative = representativePhone.replace(/\D/g, "");
  if (
    office.categoryId === "unknown" ||
    office.id.includes("city-general") ||
    (phone && representative && phone === representative)
  ) {
    return "representative";
  }
  if (office.id.includes("self-reliance") || office.plainName.includes("自立相談")) {
    return "self-reliance";
  }
  return "direct";
}

export function transferTarget(categoryId: string): string {
  return TRANSFER_TARGETS[categoryId] ?? TRANSFER_TARGETS.unknown;
}

export function selectOffices(
  offices: Office[],
  municipalityId: string,
  categoryId: string,
  representativePhone = "",
): Office[] {
  if (!municipalityId) return [];
  const local = offices.filter((item) => item.municipalityId === municipalityId);
  const direct = local.filter((item) =>
    item.categoryId === categoryId &&
    officeContactType(item, representativePhone) !== "representative");
  const selfReliance = local.filter(
    (item) => officeContactType(item, representativePhone) === "self-reliance",
  );
  const representatives = local.filter(
    (item) =>
      officeContactType(item, representativePhone) === "representative" &&
      (item.categoryId === "unknown" || item.categoryId === categoryId),
  );

  if (categoryId === "violence") return direct;
  const ordered = SELF_RELIANCE_FIRST_CATEGORIES.has(categoryId)
    ? [...selfReliance, ...direct, ...representatives]
    : [...direct, ...selfReliance, ...representatives];
  return [...new Map(ordered.map((item) => [item.id, item])).values()];
}
