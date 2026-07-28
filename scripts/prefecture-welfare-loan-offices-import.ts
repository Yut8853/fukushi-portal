import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import { escapeCsv, parseCsv } from "../lib/csv";

type Contact = {
  code: string;
  phone: string;
  fax: string;
};

const contacts: Contact[] = [
  { code: "01", phone: "011-241-3976", fax: "011-251-3971" },
  { code: "02", phone: "017-723-1391", fax: "017-723-1394" },
  { code: "03", phone: "019-637-4466", fax: "019-637-9722" },
  { code: "04", phone: "022-779-7440", fax: "022-715-8507" },
  { code: "05", phone: "018-864-2711", fax: "018-864-2742" },
  { code: "06", phone: "023-622-5805", fax: "023-626-1623" },
  { code: "07", phone: "024-523-1251", fax: "024-523-4477" },
  { code: "08", phone: "029-241-1133", fax: "029-241-1434" },
  { code: "09", phone: "028-622-0524", fax: "028-621-5298" },
  { code: "10", phone: "027-255-6033", fax: "027-255-6173" },
  { code: "11", phone: "048-822-1191", fax: "048-822-1449" },
  { code: "12", phone: "043-245-1101", fax: "043-245-9338" },
  { code: "13", phone: "03-3268-7171", fax: "03-3235-5979" },
  { code: "14", phone: "045-534-3791", fax: "045-314-3472" },
  { code: "15", phone: "025-281-5520", fax: "025-285-0303" },
  { code: "16", phone: "076-432-2958", fax: "076-432-6124" },
  { code: "17", phone: "076-224-1212", fax: "076-222-8900" },
  { code: "18", phone: "0776-24-2339", fax: "0776-24-0041" },
  { code: "19", phone: "055-254-8610", fax: "055-254-8614" },
  { code: "20", phone: "026-228-4244", fax: "026-291-5180" },
  { code: "21", phone: "058-201-1545", fax: "058-275-4858" },
  { code: "22", phone: "054-254-5248", fax: "054-251-7508" },
  { code: "23", phone: "052-212-5500", fax: "052-212-5507" },
  { code: "24", phone: "059-227-5145", fax: "059-227-8155" },
  { code: "25", phone: "077-567-3920", fax: "077-566-3611" },
  { code: "26", phone: "075-252-6291", fax: "075-252-6311" },
  { code: "27", phone: "06-6762-9471", fax: "06-6767-1562" },
  { code: "28", phone: "078-242-4633", fax: "078-242-7947" },
  { code: "29", phone: "0744-29-0100", fax: "0744-29-0101" },
  { code: "30", phone: "073-435-5222", fax: "073-435-5226" },
  { code: "31", phone: "0857-59-6331", fax: "0857-59-6341" },
  { code: "32", phone: "0852-32-5970", fax: "0852-21-0798" },
  { code: "33", phone: "086-226-2822", fax: "086-225-6602" },
  { code: "34", phone: "082-254-3411", fax: "082-252-2133" },
  { code: "35", phone: "083-924-2777", fax: "083-922-1295" },
  { code: "36", phone: "088-654-4461", fax: "088-654-9250" },
  { code: "37", phone: "087-861-0545", fax: "087-861-2664" },
  { code: "38", phone: "089-921-8344", fax: "089-921-5289" },
  { code: "39", phone: "088-844-9007", fax: "088-844-3852" },
  { code: "40", phone: "092-584-3377", fax: "092-584-3369" },
  { code: "41", phone: "0952-23-2145", fax: "0952-25-2980" },
  { code: "42", phone: "095-846-8600", fax: "095-844-5948" },
  { code: "43", phone: "096-324-5454", fax: "096-355-5440" },
  { code: "44", phone: "097-558-0300", fax: "097-515-7770" },
  { code: "45", phone: "0985-22-3145", fax: "0985-27-9003" },
  { code: "46", phone: "099-257-3855", fax: "099-214-3812" },
  { code: "47", phone: "098-887-2000", fax: "098-887-2024" },
];

async function main(): Promise<void> {
const root = path.resolve(process.cwd());
const officesPath = path.join(root, "data/offices.csv");
const sourcesPath = path.join(root, "data/sources.csv");
const prefecturesPath = path.join(root, "data/prefectures.csv");
const verifiedAt = "2026-07-28";
const sourceId = "source-prefecture-shakyo-welfare-loan-contacts";
const officialUrl =
  "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/hukushi_kaigo/seikatsuhogo/seikatsu-fukushi-shikin1/index.html";

const officeText = await readFile(officesPath, "utf8");
const existingOfficeIds = new Set(parseCsv(officeText).map((row) => row.id));
const prefectures = new Map(
  parseCsv(await readFile(prefecturesPath, "utf8")).map((row) => [row.code, row.name]),
);
const header = officeText.slice(0, officeText.indexOf("\n")).split(",");

const additions = contacts
  .filter(({ code }) => !existingOfficeIds.has(`prefecture-welfare-loan-${code}`))
  .map(({ code, phone, fax }) => {
    const prefecture = prefectures.get(code);
    if (!prefecture) throw new Error(`都道府県コードが見つかりません: ${code}`);
    const row: Record<string, string> = {
      id: `prefecture-welfare-loan-${code}`,
      municipalityId: "",
      categoryId: "food",
      name: `${prefecture}社会福祉協議会`,
      plainName: "食料や当面の生活費について相談する",
      department: "生活福祉資金担当",
      description:
        "生活福祉資金や、お住まいの地域の社会福祉協議会について問い合わせられる都道府県窓口です。FAXには、相談内容、返信可能な連絡方法、連絡してよい時間帯を書いてください。",
      postalCode: "",
      address: "",
      phone,
      fax,
      email: "",
      contactFormUrl: "",
      officialUrl,
      openingHours: "",
      closedDays: "",
      reservationRequired: "",
      availableMethods: "電話・FAX",
      accessibility: "",
      languages: "",
      emergencyAlternative: "今日の食事がない場合は、市区町村の自立相談支援窓口にも連絡してください。",
      serviceArea: `${prefecture}全域`,
      eligibilityConditions:
        "低所得世帯など生活福祉資金の対象となる可能性がある人。貸付には審査があります。",
      sourceId,
      status: "published",
      lastVerifiedAt: verifiedAt,
      contactType: "direct",
      verificationLevel: "primary_source_import",
      scope: "prefecture",
      prefectureCode: code,
    };
    return header.map((column) => escapeCsv(row[column] ?? "")).join(",");
  });

if (additions.length) await appendFile(officesPath, additions.join("\n") + "\n");

const sourceText = await readFile(sourcesPath, "utf8");
if (!parseCsv(sourceText).some((row) => row.id === sourceId)) {
  await appendFile(
    sourcesPath,
    [
      sourceId,
      "都道府県社会福祉協議会の生活福祉資金窓口（厚生労働省・全国社会福祉協議会・公式FAX一覧）",
      "https://www.fukushimakenshakyo.or.jp/files/libs/1171/202204141741029748.pdf",
      "厚生労働省・全国社会福祉協議会",
      "official",
      "published",
      verifiedAt,
    ]
      .map(escapeCsv)
      .join(",") + "\n",
  );
}

console.log(`都道府県社会福祉協議会を追加: ${additions.length}件`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
