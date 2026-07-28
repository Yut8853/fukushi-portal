import path from "node:path";
import { writeFile } from "node:fs/promises";
import { escapeCsv, readCsvFile } from "../lib/csv";

const dataDir = path.join(process.cwd(), "data");

const yokohamaWards = [
  ["tsurumi", "鶴見区", "045-510-1782", "045-510-1899", "230-0051", "横浜市鶴見区鶴見中央3-20-1"],
  [
    "kanagawa",
    "神奈川区",
    "045-411-7103",
    "045-411-0361",
    "221-0824",
    "横浜市神奈川区広台太田町3-8",
  ],
  ["nishi", "西区", "045-320-8407", "045-322-9877", "220-0051", "横浜市西区中央1-5-10"],
  ["naka", "中区", "045-224-8241", "045-224-8239", "231-0021", "横浜市中区日本大通35"],
  ["minami", "南区", "045-341-1203", "045-341-1219", "232-0024", "横浜市南区浦舟町2-33"],
  ["konan", "港南区", "045-847-8404", "045-847-0378", "233-0003", "横浜市港南区港南4-2-10"],
  [
    "hodogaya",
    "保土ケ谷区",
    "045-334-6314",
    "045-334-6030",
    "240-0001",
    "横浜市保土ケ谷区川辺町2-9",
  ],
  ["asahi", "旭区", "045-954-6104", "045-951-5831", "241-0022", "横浜市旭区鶴ケ峰1-4-12"],
  ["isogo", "磯子区", "045-750-2405", "045-750-2542", "235-0016", "横浜市磯子区磯子3-5-1"],
  ["kanazawa", "金沢区", "045-788-7814", "045-788-7883", "236-0021", "横浜市金沢区泥亀2-9-1"],
  ["kohoku", "港北区", "045-540-2329", "045-540-2358", "222-0032", "横浜市港北区大豆戸町26-1"],
  ["midori", "緑区", "045-930-2318", "045-930-2329", "226-0013", "横浜市緑区寺山町118"],
  ["aoba", "青葉区", "045-978-2446", "045-978-2416", "225-0024", "横浜市青葉区市ケ尾町31-4"],
  ["tsuzuki", "都筑区", "045-948-2311", "045-948-2486", "224-0032", "横浜市都筑区茅ケ崎中央32-1"],
  ["totsuka", "戸塚区", "045-866-8431", "045-866-2683", "244-0003", "横浜市戸塚区戸塚町16-17"],
  ["sakae", "栄区", "045-894-8400", "045-894-3423", "247-0005", "横浜市栄区桂町303-19"],
  ["izumi", "泉区", "045-800-2305", "045-800-2515", "245-0024", "横浜市泉区和泉中央北5-1-1"],
  ["seya", "瀬谷区", "045-367-5705", "045-365-6351", "246-0021", "横浜市瀬谷区二ツ橋町190"],
] as const;

async function main() {
  const municipalitiesPath = path.join(dataDir, "municipalities.csv");
  const municipalities = await readCsvFile(municipalitiesPath);
  const municipalityHeaders = Object.keys(municipalities[0] ?? {});
  const sapporo = municipalities.find((item) => item.id === "jp-01100");
  if (!sapporo) throw new Error("札幌市が見つかりません。");
  sapporo.representativePhone = "011-211-2111";
  sapporo.lastVerifiedAt = "2026-07-27";

  await writeFile(
    municipalitiesPath,
    `${municipalityHeaders.join(",")}\n${municipalities
      .map((item) => municipalityHeaders.map((header) => escapeCsv(item[header] ?? "")).join(","))
      .join("\n")}\n`,
    "utf8",
  );

  const officesPath = path.join(dataDir, "offices.csv");
  const offices = await readCsvFile(officesPath);
  const officeHeaders = Object.keys(offices[0] ?? {});
  const sapporoGeneral = offices.find((item) => item.id === "jp-01100-city-general");
  if (!sapporoGeneral) throw new Error("札幌市代表窓口が見つかりません。");
  sapporoGeneral.phone = "011-211-2111";
  sapporoGeneral.officialUrl = "https://www.city.sapporo.jp/city/map/";
  sapporoGeneral.lastVerifiedAt = "2026-07-27";

  const oldYokohama = offices.find((item) => item.id === "yokohama-self-reliance");
  if (!oldYokohama) throw new Error("横浜市の旧相談窓口が見つかりません。");
  oldYokohama.status = "review_required";

  for (const office of offices) {
    if (
      office.id === "osaka-osaka-housing-benefit-fallback" ||
      office.id === "osaka-osaka-self-reliance-fallback"
    ) {
      office.status = "review_required";
      continue;
    }
    if (
      office.municipalityId !== "osaka-osaka" ||
      !/^osaka-osaka-(?:housing|self-reliance)-\d+$/.test(office.id)
    ) {
      continue;
    }
    const ward = office.address.match(/大阪市([^市]+区)/)?.[1];
    if (!ward) continue;
    office.serviceArea = `大阪市${ward}`;
    office.status = "published";
    office.verificationLevel = "human_verified";
  }

  const existingIds = new Set(offices.map((item) => item.id));
  for (const [slug, ward, phone, fax, postalCode, address] of yokohamaWards) {
    const id = `yokohama-self-reliance-${slug}`;
    if (existingIds.has(id)) continue;
    offices.push({
      ...Object.fromEntries(officeHeaders.map((header) => [header, ""])),
      id,
      municipalityId: "kanagawa-yokohama",
      categoryId: "housing",
      name: `${ward}役所生活支援課生活支援係`,
      plainName: `${ward}の仕事・生活・住まいの相談窓口`,
      department: `${ward}役所生活支援課生活支援係`,
      description:
        "生活に困っている方の状況を整理し、就労・家計・住まいなど必要な支援につなぐ相談窓口です。",
      postalCode,
      address,
      phone,
      fax,
      officialUrl:
        "https://www.city.yokohama.lg.jp/kenko-iryo-fukushi/fukushi-kaigo/seikatsu/madoguchi.html",
      openingHours: "8時45分～17時",
      closedDays: "土曜日・日曜日・祝日・12月29日～1月3日",
      availableMethods: "電話・来所",
      serviceArea: `横浜市${ward}`,
      sourceId: "source-yokohama-self-reliance",
      status: "published",
      lastVerifiedAt: "2026-07-27",
      contactType: "self-reliance",
      verificationLevel: "human_verified",
    });
    existingIds.add(id);
  }

  await writeFile(
    officesPath,
    `${officeHeaders.join(",")}\n${offices
      .map((item) => officeHeaders.map((header) => escapeCsv(item[header] ?? "")).join(","))
      .join("\n")}\n`,
    "utf8",
  );
  console.log(
    "札幌市代表電話、大阪市の区別管轄、横浜市18区の生活支援課を公式情報に合わせて更新しました。",
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
