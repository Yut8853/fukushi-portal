import path from "node:path";
import { writeFile } from "node:fs/promises";
import { escapeCsv, readCsvFile } from "../lib/csv";
import { getCsvPortalData } from "../lib/data/repository";
import { missingStandardOfficeRoles } from "../lib/data/quality";

const dataDirectory = path.join(process.cwd(), "data");
const officesPath = path.join(dataDirectory, "offices.csv");

async function main() {
  const data = await getCsvPortalData(dataDirectory);
  const rawOffices = await readCsvFile(officesPath);
  const headers = Object.keys(rawOffices[0] ?? {});
  const existingIds = new Set(rawOffices.map((office) => office.id));
  const additions: Record<string, string>[] = [];

  for (const municipality of data.municipalities) {
    if (municipality.status !== "published" || municipality.supportLevel === "basic") continue;
    const local = data.offices.filter((office) => office.municipalityId === municipality.id);
    const missing = missingStandardOfficeRoles(local);
    for (const role of missing) {
      if (!["selfReliance", "housingBenefit", "publicAssistance"].includes(role)) continue;
      const categoryId =
        role === "housingBenefit" ? "rent" : role === "selfReliance" ? "housing" : "money";
      const slug =
        role === "housingBenefit"
          ? "housing-benefit"
          : role === "selfReliance"
            ? "self-reliance"
            : "public-assistance";
      const id = `${municipality.id}-${slug}-fallback`;
      if (existingIds.has(id)) continue;
      const quarantined = local.find(
        (office) =>
          office.status === "review_required" &&
          (role === "selfReliance"
            ? office.contactType === "self-reliance"
            : office.contactType === "direct" && office.categoryId === categoryId) &&
          Boolean(office.sourceId),
      );
      if (!quarantined || !municipality.representativePhone) continue;
      const label =
        role === "housingBenefit"
          ? "住居確保給付金"
          : role === "selfReliance"
            ? "生活困窮者自立相談"
            : "生活保護";
      additions.push({
        id,
        municipalityId: municipality.id,
        categoryId,
        name: `${municipality.name} ${label}の公式一覧・代表電話案内`,
        plainName: `${label}の担当へつないでもらう`,
        department: municipality.name,
        description:
          "直通番号と担当区域は未確認です。代表電話では制度名だけを伝え、担当部署につないでもらってください。",
        postalCode: "",
        address: "",
        phone: municipality.representativePhone,
        fax: "",
        email: "",
        contactFormUrl: "",
        officialUrl: quarantined.officialUrl || municipality.officialUrl,
        openingHours: "",
        closedDays: "",
        reservationRequired: "",
        availableMethods: "電話・公式ページ",
        accessibility: "",
        languages: "",
        emergencyAlternative: "",
        serviceArea: municipality.name,
        eligibilityConditions: "",
        sourceId: quarantined.sourceId,
        status: "published",
        lastVerifiedAt: quarantined.lastVerifiedAt || municipality.lastVerifiedAt,
        contactType: "representative",
        verificationLevel: "primary_source_import",
      });
      existingIds.add(id);
    }
  }

  const lines = [...rawOffices, ...additions].map((office) =>
    headers.map((header) => escapeCsv(office[header] ?? "")).join(","),
  );
  await writeFile(officesPath, `${headers.join(",")}\n${lines.join("\n")}\n`, "utf8");
  console.log(`隔離窓口の代表電話フォールバックを${additions.length}件追加しました。`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
