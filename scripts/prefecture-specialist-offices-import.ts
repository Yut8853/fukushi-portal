import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";
import { escapeCsv, parseCsv } from "../lib/csv";

type OfficeSeed = Record<string, string>;

const verifiedAt = "2026-07-28";
const consumerCsvUrl = "https://www.kokusen.go.jp/map/data/consumercenters_list.csv";
const childCentersUrl = "https://www.cfa.go.jp/policies/jidougyakutai/jisou-ichiran/";
const legalAidUrl = "https://www.houterasu.or.jp/chihoujimusho/index.html";
const legalReservationUrl =
  "https://www.houterasu.or.jp/site/soudan-tatekae/houterasuhouritusoudanyoyaku.html";

const legalOfficeLabels: Record<string, string> = {
  "01": "札幌",
  "02": "青森",
  "03": "岩手",
  "04": "宮城",
  "05": "秋田",
  "06": "山形",
  "07": "福島",
  "08": "茨城",
  "09": "栃木",
  "10": "群馬",
  "11": "埼玉",
  "12": "千葉",
  "13": "東京",
  "14": "神奈川",
  "15": "新潟",
  "16": "富山",
  "17": "石川",
  "18": "福井",
  "19": "山梨",
  "20": "長野",
  "21": "岐阜",
  "22": "静岡",
  "23": "愛知",
  "24": "三重",
  "25": "滋賀",
  "26": "京都",
  "27": "大阪",
  "28": "兵庫",
  "29": "奈良",
  "30": "和歌山",
  "31": "鳥取",
  "32": "島根",
  "33": "岡山",
  "34": "広島",
  "35": "山口",
  "36": "徳島",
  "37": "香川",
  "38": "愛媛",
  "39": "高知",
  "40": "福岡",
  "41": "佐賀",
  "42": "長崎",
  "43": "熊本",
  "44": "大分",
  "45": "宮崎",
  "46": "鹿児島",
  "47": "沖縄",
};

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 10) return value.trim();
  if (digits.startsWith("050") || digits.startsWith("0570") || digits.startsWith("0120")) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.startsWith("03") || digits.startsWith("06")) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, digits.length - 4)}-${digits.slice(-4)}`;
}

function commonRow(
  prefectureCode: string,
  prefectureName: string,
  values: Partial<OfficeSeed>,
): OfficeSeed {
  return {
    municipalityId: "",
    postalCode: "",
    address: "",
    phone: "",
    fax: "",
    email: "",
    contactFormUrl: "",
    openingHours: "",
    closedDays: "",
    reservationRequired: "",
    accessibility: "",
    languages: "",
    emergencyAlternative: "",
    eligibilityConditions: "",
    status: "published",
    lastVerifiedAt: verifiedAt,
    contactType: "direct",
    verificationLevel: "primary_source_import",
    scope: "prefecture",
    prefectureCode,
    serviceArea: `${prefectureName}全域（詳しい管轄は窓口で確認してください）`,
    ...values,
  };
}

function compactHours(row: Record<string, string>): string {
  const days = ["月曜", "火曜", "水曜", "木曜", "金曜", "土曜", "日曜"];
  const groups: Array<{ days: string[]; hours: string }> = [];
  for (const day of days) {
    const start = row[`${day}_相談受付開始時刻`] ?? "";
    const end = row[`${day}_相談受付終了時刻`] ?? "";
    const hours = !start || start === "休" ? "休" : `${start}～${end}`;
    const previous = groups.at(-1);
    if (previous?.hours === hours) previous.days.push(day.replace("曜", ""));
    else groups.push({ days: [day.replace("曜", "")], hours });
  }
  return groups
    .filter((group) => group.hours !== "休")
    .map((group) => `${group.days.join("・")}曜 ${group.hours}`)
    .join("／");
}

function parseConsumerCenters(csv: string, prefectures: Map<string, string>): OfficeSeed[] {
  const rows = parseCsv(csv.replace(/^\uFEFF/, ""));
  const selected = new Map<string, Record<string, string>>();
  for (const row of rows.filter(
    (candidate) => candidate["消費生活センター区分"] === "都道府県センター",
  )) {
    const code = (row["都道府県コード（JIS X 0401）"] ?? "").padStart(2, "0");
    if (!selected.has(code)) selected.set(code, row);
  }
  return [...selected]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, row]) => row)
    .map((row) => {
      const code = (row["都道府県コード（JIS X 0401）"] ?? "").padStart(2, "0");
      const prefecture = prefectures.get(code);
      if (!prefecture) throw new Error(`消費生活センターの都道府県コードが不明です: ${code}`);
      const rawFormUrl = row["インターネット相談受付"] ?? "";
      const formUrl = /^https?:\/\//.test(rawFormUrl) ? rawFormUrl : "";
      const fax = normalizePhone(row["相談受付用FAX番号"] ?? "");
      return commonRow(code, prefecture, {
        id: `prefecture-consumer-center-${code}`,
        categoryId: "debt",
        name: row["消費生活センター名"],
        plainName: "借金や契約トラブルを消費生活相談員に相談する",
        department: row["消費生活センター名"],
        description:
          "商品・サービスの契約、請求、多重債務などの消費生活相談を受け付ける都道府県の専門窓口です。",
        postalCode: row["郵便番号"],
        address: `${row["所在地１"]}${row["所在地２"]}`,
        phone: normalizePhone(row["相談電話番号"]),
        fax,
        contactFormUrl: formUrl,
        officialUrl: row["消費生活センターURL"],
        openingHours: compactHours(row),
        closedDays: row["特記事項"].replaceAll("<br>", "／"),
        availableMethods: ["電話", formUrl && "オンライン", fax && "FAX"]
          .filter(Boolean)
          .join("・"),
        emergencyAlternative:
          "最寄りの窓口につながらない場合は消費者ホットライン188を利用できます。",
        eligibilityConditions: "原則として、その都道府県に住む消費者",
        sourceId: "source-kokusen-consumer-centers-20260630",
      });
    });
}

function parseChildCenters(html: string, prefectures: Map<string, string>): OfficeSeed[] {
  const $ = cheerio.load(html);
  return [...prefectures].map(([code, prefecture]) => {
    const heading = $("h2")
      .filter((_, element) => $(element).text().trim() === prefecture)
      .first();
    if (!heading.length) throw new Error(`児童相談所の見出しがありません: ${prefecture}`);
    const text = heading.nextUntil("h2").filter("p").first().text().replace(/\s+/g, " ").trim();
    const match = text.match(
      /^[〇●◎■\s]*(.+?)(?:住\s*所|住所)：?〒?(\d{3}-\d{4})?\s*(.+?)電話番号：\s*([0-9-]+)/,
    );
    if (!match) throw new Error(`児童相談所を解析できません: ${prefecture}: ${text}`);
    return commonRow(code, prefecture, {
      id: `prefecture-child-guidance-center-${code}`,
      categoryId: "children",
      name: match[1].trim(),
      plainName: "子どもの安全や家庭の悩みを児童相談所に相談する",
      department: match[1].trim(),
      description:
        "18歳未満の子どもについて、虐待、養育、発達、非行などの相談を受け付ける専門機関です。",
      postalCode: match[2] ?? "",
      address: match[3].trim(),
      phone: normalizePhone(match[4]),
      officialUrl: childCentersUrl,
      availableMethods: "電話・来所",
      emergencyAlternative:
        "虐待かもしれない、子どもの安全が心配なときは児童相談所虐待対応ダイヤル189へ。差し迫った危険は110へ連絡してください。",
      eligibilityConditions: "18歳未満の子ども、保護者、家族、近隣の人など",
      sourceId: "source-cfa-child-guidance-centers-20260401",
    });
  });
}

function parseLegalAidOffices(html: string, prefectures: Map<string, string>): OfficeSeed[] {
  const $ = cheerio.load(html);
  return [...prefectures].map(([code, prefecture]) => {
    const label = legalOfficeLabels[code];
    const link = $("a")
      .filter((_, element) => $(element).text().trim() === label)
      .first();
    const officialUrl = new URL(link.attr("href") ?? "", legalAidUrl).toString();
    if (!link.length) throw new Error(`法テラスの事務所がありません: ${prefecture}`);
    return commonRow(code, prefecture, {
      id: `prefecture-legal-aid-${code}`,
      categoryId: "debt",
      name: `法テラス${label}`,
      plainName: "借金を弁護士・司法書士に相談する",
      department: `法テラス${label}`,
      description:
        "収入・資産などの条件を満たす人は、借金を含む法律問題について無料法律相談や弁護士・司法書士費用の立替を利用できる場合があります。Web予約の対応状況は地方事務所ごとに異なります。",
      phone: "0570-078374",
      contactFormUrl: legalReservationUrl,
      officialUrl,
      openingHours: "平日9時～21時／土曜9時～17時",
      closedDays: "日曜日・祝日",
      reservationRequired: "true",
      availableMethods: "電話・Web予約案内",
      eligibilityConditions: "無料法律相談・費用立替には収入・資産などの利用条件があります",
      sourceId: "source-houterasu-local-offices-20260728",
    });
  });
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "user-agent": "fukushi-portal-data-import/1.0" },
  });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
}

async function main(): Promise<void> {
  const root = path.resolve(process.cwd());
  const officesPath = path.join(root, "data/offices.csv");
  const sourcesPath = path.join(root, "data/sources.csv");
  const prefectures = new Map(
    parseCsv(await readFile(path.join(root, "data/prefectures.csv"), "utf8")).map((row) => [
      row.code,
      row.name,
    ]),
  );
  const [consumerCsv, childHtml, legalHtml] = await Promise.all([
    fetchText(consumerCsvUrl),
    fetchText(childCentersUrl),
    fetchText(legalAidUrl),
  ]);
  const seeds = [
    ...parseConsumerCenters(consumerCsv, prefectures),
    ...parseChildCenters(childHtml, prefectures),
    ...parseLegalAidOffices(legalHtml, prefectures),
  ];
  if (seeds.length !== 141) throw new Error(`追加候補が141件ではありません: ${seeds.length}`);

  const officeText = await readFile(officesPath, "utf8");
  const header = officeText.slice(0, officeText.indexOf("\n")).split(",");
  const replacementIds = new Set(seeds.map((seed) => seed.id));
  const existingRows = parseCsv(officeText).filter((row) => !replacementIds.has(row.id));
  const allRows = [...existingRows, ...seeds];
  await writeFile(
    officesPath,
    [
      header.join(","),
      ...allRows.map((row) => header.map((column) => escapeCsv(row[column] ?? "")).join(",")),
    ].join("\n") + "\n",
  );

  const sourceText = await readFile(sourcesPath, "utf8");
  const sourceHeader = sourceText.slice(0, sourceText.indexOf("\n")).split(",");
  const sourceSeeds: OfficeSeed[] = [
    {
      id: "source-kokusen-consumer-centers-20260630",
      title: "全国の消費生活センター等一覧データ（2026年6月30日現在）",
      url: consumerCsvUrl,
      publisher: "独立行政法人国民生活センター",
      sourceType: "official",
      status: "published",
      lastCheckedAt: verifiedAt,
    },
    {
      id: "source-cfa-child-guidance-centers-20260401",
      title: "児童相談所一覧（2026年4月1日現在）",
      url: childCentersUrl,
      publisher: "こども家庭庁",
      sourceType: "official",
      status: "published",
      lastCheckedAt: verifiedAt,
    },
    {
      id: "source-houterasu-local-offices-20260728",
      title: "お近くの法テラス（地方事務所一覧）",
      url: legalAidUrl,
      publisher: "日本司法支援センター法テラス",
      sourceType: "official",
      status: "published",
      lastCheckedAt: verifiedAt,
    },
  ];
  const sourceIds = new Set(sourceSeeds.map((source) => source.id));
  const sources = parseCsv(sourceText).filter((row) => !sourceIds.has(row.id));
  await writeFile(
    sourcesPath,
    [
      sourceHeader.join(","),
      ...[...sources, ...sourceSeeds].map((row) =>
        sourceHeader.map((column) => escapeCsv(row[column] ?? "")).join(","),
      ),
    ].join("\n") + "\n",
  );
  console.log("都道府県専門窓口を追加: 消費生活47 / 児童相談所47 / 法テラス47");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
