import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import { escapeCsv, parseCsv } from "../lib/csv";

type Center = {
  code: string;
  name: string;
  phone: string;
  url: string;
};

const centers: Center[] = [
  {
    code: "01",
    name: "北海道立女性相談支援センター",
    phone: "011-666-9955",
    url: "https://www.pref.hokkaido.lg.jp/hf/jsc/index.html",
  },
  {
    code: "02",
    name: "青森県女性相談支援センター",
    phone: "017-781-2000",
    url: "https://www.pref.aomori.lg.jp/soshiki/kodomo/ao-shien/jososetsumei.html",
  },
  {
    code: "03",
    name: "岩手県福祉総合相談センター",
    phone: "019-629-9610",
    url: "https://www.pref.iwate.jp/fukushisoudan/josei/1015938.html",
  },
  {
    code: "04",
    name: "宮城県女性相談支援センター",
    phone: "022-256-0965",
    url: "https://www.pref.miyagi.jp/soshiki/jyoseict",
  },
  {
    code: "05",
    name: "秋田県子ども・女性・障害者相談センター",
    phone: "018-835-9052",
    url: "https://www.pref.akita.lg.jp/pages/genre/jyosou",
  },
  {
    code: "06",
    name: "山形県女性相談支援センター（山形県中央配偶者暴力相談支援センター）",
    phone: "023-627-1196",
    url: "https://www.pref.yamagata.jp/010002/kurashi/jinken/dv/dvsoudansaki.html",
  },
  {
    code: "07",
    name: "女性のための相談支援センター",
    phone: "024-522-1010",
    url: "http://www.pref.fukushima.lg.jp/sec/21820a/",
  },
  {
    code: "08",
    name: "茨城県女性相談センター",
    phone: "029-221-4166",
    url: "http://www.pref.ibaraki.jp/hokenfukushi/fukusise/fujin/fukuso/hujinpage.html",
  },
  {
    code: "09",
    name: "とちぎ男女共同参画センター",
    phone: "028-665-8720",
    url: "http://www.parti.jp/soudan/index.html",
  },
  {
    code: "10",
    name: "群馬県女性相談支援センター",
    phone: "027-261-4466",
    url: "https://www.pref.gunma.jp/04/c2210031.html",
  },
  {
    code: "11",
    name: "埼玉県男女共同参画推進センター",
    phone: "048-600-3700",
    url: "https://www.pref.saitama.lg.jp/withyou/counsel/dv.html",
  },
  {
    code: "12",
    name: "千葉県女性サポートセンター",
    phone: "043-206-8002",
    url: "http://www.pref.chiba.lg.jp/jsc/index.html",
  },
  {
    code: "13",
    name: "東京ウィメンズプラザ",
    phone: "03-5467-1721",
    url: "https://www.twp.metro.tokyo.lg.jp/consult/tabid/86/Default.aspx",
  },
  {
    code: "14",
    name: "神奈川県立かながわ男女共同参画センター",
    phone: "0466-26-5550",
    url: "https://www.pref.kanagawa.jp/docs/x2t/dv_soudan_01.html",
  },
  {
    code: "15",
    name: "新潟県女性相談支援センター",
    phone: "025-381-1111",
    url: "http://www.pref.niigata.lg.jp/chuofukushi/1191429036057.html",
  },
  {
    code: "16",
    name: "富山県女性相談支援センター",
    phone: "076-465-6722",
    url: "https://www.pref.toyama.jp/1257/kensei/kenseiunei/kensei/soshiki/12/1257.html",
  },
  {
    code: "17",
    name: "石川県女性相談支援センター",
    phone: "076-221-8740",
    url: "https://www.pref.ishikawa.lg.jp/josou/soudansien/dvsoudan.html",
  },
  {
    code: "18",
    name: "福井県児童・女性相談所",
    phone: "0776-35-1725",
    url: "https://www.pref.fukui.lg.jp/doc/jijosou/jyosei.html",
  },
  {
    code: "19",
    name: "山梨県女性相談支援センター",
    phone: "055-254-8635",
    url: "https://www.pref.yamanashi.jp/josei/",
  },
  {
    code: "20",
    name: "長野県女性相談支援センター",
    phone: "026-235-5710",
    url: "https://www.pref.nagano.lg.jp/joseisodan/index.html",
  },
  {
    code: "21",
    name: "岐阜県女性相談支援センター",
    phone: "058-213-2131",
    url: "https://www.pref.gifu.lg.jp/soshiki/22310/",
  },
  {
    code: "22",
    name: "静岡県女性相談支援センター",
    phone: "054-286-9217",
    url: "https://www.pref.shizuoka.jp/kodomokyoiku/kodomokosodate/dv/1004159/index.html",
  },
  {
    code: "23",
    name: "愛知県女性相談支援センター",
    phone: "052-962-2527",
    url: "https://www.pref.aichi.jp/soshiki/chiikifukushi/0000012699.html",
  },
  {
    code: "24",
    name: "三重県女性相談支援センター",
    phone: "059-231-5600",
    url: "http://www.pref.mie.lg.jp/JOSOU/HP",
  },
  {
    code: "25",
    name: "滋賀県中央子ども家庭相談センター",
    phone: "077-564-7867",
    url: "https://www.pref.shiga.lg.jp/kodomokatei/zyosei/334306.html",
  },
  {
    code: "26",
    name: "京都府家庭支援総合センター",
    phone: "075-531-9910",
    url: "http://www.pref.kyoto.jp/kateisien-sogo/",
  },
  {
    code: "27",
    name: "大阪府女性相談センター",
    phone: "06-6949-6022",
    url: "https://www.pref.osaka.lg.jp/o090170/joseisodan/dvc/index.html",
  },
  {
    code: "28",
    name: "兵庫県女性家庭センター",
    phone: "078-732-7700",
    url: "https://web.pref.hyogo.lg.jp/kf23/hw37_000000002.html",
  },
  {
    code: "29",
    name: "奈良県中央こども家庭相談センター",
    phone: "0742-22-4083",
    url: "https://www.pref.nara.jp/1727.htm",
  },
  {
    code: "30",
    name: "和歌山県DV相談支援センター",
    phone: "073-445-0793",
    url: "https://www.pref.wakayama.lg.jp/prefg/110502/index.html",
  },
  {
    code: "31",
    name: "鳥取県福祉相談センター",
    phone: "0857-27-8630",
    url: "http://www.pref.tottori.lg.jp/34870.htm",
  },
  {
    code: "32",
    name: "島根県女性相談センター",
    phone: "0852-25-8071",
    url: "https://www.pref.shimane.lg.jp/education/child/dv/sodan/",
  },
  {
    code: "33",
    name: "岡山県女性相談支援センター",
    phone: "086-235-6060",
    url: "http://www.pref.okayama.jp/page/detail-29252.html",
  },
  {
    code: "34",
    name: "広島県西部こども家庭センター女性支援課",
    phone: "082-254-0391",
    url: "https://www.pref.hiroshima.lg.jp/site/kodomokateicenter/1170806048844.html",
  },
  {
    code: "35",
    name: "山口県男女共同参画相談センター",
    phone: "083-901-1122",
    url: "https://www.pref.yamaguchi.lg.jp/soshiki/37/155996.html",
  },
  {
    code: "36",
    name: "徳島県中央こども女性相談センター",
    phone: "088-652-5503",
    url: "https://www.pref.tokushima.lg.jp/ippannokata/kenko/kosodateshien/2009032800013",
  },
  {
    code: "37",
    name: "香川県子ども女性相談センター",
    phone: "087-835-3211",
    url: "https://www.pref.kagawa.lg.jp/kodomo/kj-soudan/kfvn.html",
  },
  {
    code: "38",
    name: "愛媛県福祉総合支援センター",
    phone: "089-927-3490",
    url: "http://www.pref.ehime.jp/h20300/fukushi/chiiki/fujin01.html",
  },
  {
    code: "39",
    name: "高知県女性相談支援センター",
    phone: "088-833-0783",
    url: "https://www.pref.kochi.lg.jp/soshiki/060405/",
  },
  {
    code: "40",
    name: "福岡県女性相談支援センター",
    phone: "070-4442-3893",
    url: "https://www.pref.fukuoka.lg.jp/contents/dv20091112.html",
  },
  {
    code: "41",
    name: "佐賀県立男女共同参画センター「アバンセ」",
    phone: "0952-23-3630",
    url: "https://www.avance.or.jp/dvsougou.html",
  },
  {
    code: "42",
    name: "長崎県長崎こども・女性・障害者支援センター",
    phone: "095-846-0565",
    url: "https://www.pref.nagasaki.jp/bunrui/hukushi-hoken/gosodanmadoguchi/dv/",
  },
  {
    code: "43",
    name: "熊本県女性相談センター",
    phone: "096-381-7110",
    url: "https://www.pref.kumamoto.jp/soshiki/28/391.html",
  },
  {
    code: "44",
    name: "大分県女性相談支援センター",
    phone: "097-544-3900",
    url: "https://www.pref.oita.jp/site/fuso/",
  },
  {
    code: "45",
    name: "宮崎県女性相談支援センター",
    phone: "0985-22-3858",
    url: "https://www.pref.miyazaki.lg.jp/desaki/kurashi/jinken/josei-soudan.html",
  },
  {
    code: "46",
    name: "鹿児島県女性相談支援センター",
    phone: "099-222-1467",
    url: "http://www.pref.kagoshima.jp/ab15/kurashi-kankyo/jinken/dv/shiencenter2.html",
  },
  {
    code: "47",
    name: "沖縄県女性相談支援センター（沖縄県配偶者暴力相談支援センター）",
    phone: "098-854-1172",
    url: "https://www.pref.okinawa.lg.jp/kurashikankyo/danjo/1005154/1017867.html",
  },
];

const sourceId = "source-cao-dv-centers-20260701";
const verifiedAt = "2026-07-01";

async function main() {
  if (centers.length !== 47 || new Set(centers.map((item) => item.code)).size !== 47) {
    throw new Error("47都道府県すべてに1窓口ずつ必要です。");
  }
  const officesPath = path.join(process.cwd(), "data", "offices.csv");
  const prefecturesPath = path.join(process.cwd(), "data", "prefectures.csv");
  const text = await readFile(officesPath, "utf8");
  const prefectureNames = new Map(
    parseCsv(await readFile(prefecturesPath, "utf8")).map((row) => [row.code, row.name]),
  );
  const rows = parseCsv(text);
  const headers = Object.keys(rows[0] ?? {});
  const existingIds = new Set(rows.map((row) => row.id));
  const additions = centers
    .filter((center) => !existingIds.has(`prefecture-dv-center-${center.code}`))
    .map((center) => {
      const row: Record<string, string> = Object.fromEntries(headers.map((header) => [header, ""]));
      Object.assign(row, {
        id: `prefecture-dv-center-${center.code}`,
        municipalityId: "",
        categoryId: "violence",
        name: center.name,
        plainName: "配偶者やパートナーからの暴力を相談する",
        description:
          "配偶者やパートナーなどからの暴力について相談できる、都道府県の配偶者暴力相談支援センターです。安全確保や今後の生活について一緒に考えてもらえます。",
        phone: center.phone,
        officialUrl: center.url,
        availableMethods: "電話",
        emergencyAlternative: "差し迫った危険がある場合は110番を利用してください。",
        serviceArea: `${prefectureNames.get(center.code) ?? center.code}全域`,
        eligibilityConditions:
          "配偶者やパートナーなどからの暴力について相談したい人。詳しい対象は窓口で確認してください。",
        sourceId,
        status: "published",
        lastVerifiedAt: verifiedAt,
        contactType: "direct",
        verificationLevel: "primary_source_import",
        scope: "prefecture",
        prefectureCode: center.code,
      });
      return headers.map((header) => escapeCsv(row[header] ?? "")).join(",");
    });
  if (!additions.length) {
    console.log("追加対象はありません。47件は投入済みです。");
    return;
  }
  await appendFile(officesPath, `${additions.join("\n")}\n`, "utf8");
  console.log(`DV都道府県窓口を${additions.length}件追加しました。`);
}

main().catch((error: unknown) => {
  console.error(`エラー: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
