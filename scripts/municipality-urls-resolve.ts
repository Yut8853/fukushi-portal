import path from "node:path";
import { writeFile } from "node:fs/promises";
import { resolve4 } from "node:dns/promises";
import { toRomaji } from "wanakana";
import { escapeCsv, readCsvFile, type CsvRow } from "../lib/csv";
import { assertSafeUrl } from "../crawler/security";

const file = path.join(process.cwd(), "data", "nationwide-municipalities.csv");
const headers = [
  "id",
  "prefectureCode",
  "municipalityCode",
  "name",
  "nameKana",
  "municipalityType",
  "entityType",
  "parentMunicipality",
  "lifecycleStatus",
  "officialUrl",
  "sourceUrl",
];
const prefectureRoman: Record<string, string> = {
  "01": "hokkaido",
  "02": "aomori",
  "03": "iwate",
  "04": "miyagi",
  "05": "akita",
  "06": "yamagata",
  "07": "fukushima",
  "08": "ibaraki",
  "09": "tochigi",
  "10": "gunma",
  "11": "saitama",
  "12": "chiba",
  "13": "tokyo",
  "14": "kanagawa",
  "15": "niigata",
  "16": "toyama",
  "17": "ishikawa",
  "18": "fukui",
  "19": "yamanashi",
  "20": "nagano",
  "21": "gifu",
  "22": "shizuoka",
  "23": "aichi",
  "24": "mie",
  "25": "shiga",
  "26": "kyoto",
  "27": "osaka",
  "28": "hyogo",
  "29": "nara",
  "30": "wakayama",
  "31": "tottori",
  "32": "shimane",
  "33": "okayama",
  "34": "hiroshima",
  "35": "yamaguchi",
  "36": "tokushima",
  "37": "kagawa",
  "38": "ehime",
  "39": "kochi",
  "40": "fukuoka",
  "41": "saga",
  "42": "nagasaki",
  "43": "kumamoto",
  "44": "oita",
  "45": "miyazaki",
  "46": "kagoshima",
  "47": "okinawa",
};

function slug(kana: string, type: string): string {
  const endings: Record<string, RegExp> = {
    city: /し$/,
    special_ward: /く$/,
    town: /(?:まち|ちょう)$/,
    village: /(?:むら|そん)$/,
  };
  const base = kana.replace(endings[type] ?? /$^/, "");
  return toRomaji(base)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function candidates(item: CsvRow, prefectureSlug: string): string[] {
  const name = slug(item.nameKana, item.municipalityType);
  const prefix =
    item.municipalityType === "village"
      ? "vill"
      : item.municipalityType === "special_ward"
        ? "city"
        : item.municipalityType;
  const alternatives =
    item.municipalityType === "village"
      ? ["vill", "village"]
      : item.municipalityType === "special_ward"
        ? ["city", "ward"]
        : [prefix];
  return [
    ...new Set(
      alternatives
        .flatMap((kind) => [
          `https://www.${kind}.${name}.lg.jp/`,
          `https://${kind}.${name}.lg.jp/`,
          `https://www.${kind}.${name}.${prefectureSlug}.jp/`,
          `https://www.${name}.${kind}.${prefectureSlug}.jp/`,
        ])
        .concat([
          `https://www.${name}.lg.jp/`,
          `https://${name}.lg.jp/`,
          `https://www.${name}.${prefectureSlug}.jp/`,
        ]),
    ),
  ];
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#x2F;/gi, "/")
    .replace(/&#47;/g, "/");
}

async function searchCandidates(item: CsvRow): Promise<string[]> {
  const query = encodeURIComponent(`"${item.name}" 自治体 公式サイト`);
  const urls: string[] = [];
  const headers = {
    "user-agent": "Mozilla/5.0 (compatible; FukushiPortalOfficialUrlResolver/1.0)",
  };
  const yahoo = await fetch(`https://search.yahoo.co.jp/search?p=${query}`, {
    headers,
    signal: AbortSignal.timeout(10_000),
  });
  if (yahoo.ok) {
    const html = await yahoo.text();
    for (const match of html.matchAll(/<a[^>]+href="(https:[^"]+)"/g)) {
      urls.push(decodeHtml(match[1]));
    }
  }
  if (urls.length < 3) {
    const duck = await fetch(`https://html.duckduckgo.com/html/?q=${query}&kl=jp-jp`, {
      headers,
      signal: AbortSignal.timeout(10_000),
    });
    if (duck.ok) {
      const html = await duck.text();
      for (const match of html.matchAll(/class="result__a"[^>]+href="([^"]+)"/g)) {
        const href = decodeHtml(match[1]);
        const wrapped = new URL(href, "https://duckduckgo.com");
        urls.push(wrapped.searchParams.get("uddg") ?? wrapped.href);
      }
    }
  }
  return [...new Set(urls)]
    .filter((raw) => {
      try {
        const url = new URL(raw);
        return (
          url.protocol === "https:" &&
          !/yahoo|duckduckgo|wikipedia|youtube|facebook|instagram|line\.me|x\.com$/.test(
            url.hostname,
          )
        );
      } catch {
        return false;
      }
    })
    .slice(0, 10);
}

function privateAddress(address: string): boolean {
  if (
    address === "::" ||
    address === "::1" ||
    address.startsWith("127.") ||
    address.startsWith("10.") ||
    address.startsWith("192.168.") ||
    address.startsWith("169.254.")
  )
    return true;
  const parts = address.split(".").map(Number);
  if (parts.length === 4 && parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  const lower = address.toLowerCase();
  return lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80:");
}

async function resolvePublicUrl(rawUrl: string): Promise<URL> {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" || url.username || url.password)
    throw new Error("安全でない候補URL");
  const addresses = await Promise.race([
    resolve4(url.hostname),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("DNS確認タイムアウト")), 3000),
    ),
  ]);
  if (!addresses.length) throw new Error("DNSレコードなし");
  if (addresses.some(privateAddress)) throw new Error("プライベートIPを拒否");
  return url;
}

async function fetchIdentity(
  rawUrl: string,
  municipalityName: string,
  strictTitle = false,
  expectedSlug = "",
): Promise<string> {
  let current = await resolvePublicUrl(rawUrl);
  for (let redirects = 0; redirects <= 4; redirects += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    try {
      const response = await fetch(current, {
        redirect: "manual",
        signal: controller.signal,
        headers: { "user-agent": "FukushiPortalOfficialUrlResolver/1.0", accept: "text/html" },
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) return "";
        current = await assertSafeUrl(new URL(location, current).href);
        continue;
      }
      if (!response.ok || !(response.headers.get("content-type") ?? "").includes("html")) return "";
      const text = (await response.text()).slice(0, 300_000);
      const title =
        text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1].replace(/<[^>]+>/g, "") ?? "";
      const governmentHost = current.hostname === "lg.jp" || current.hostname.endsWith(".lg.jp");
      const municipalityHost =
        !expectedSlug || current.hostname.replace(/[^a-z0-9]/g, "").includes(expectedSlug);
      const identity =
        text.includes(municipalityName) &&
        (!strictTitle || title.includes(municipalityName)) &&
        (!strictTitle || governmentHost || municipalityHost) &&
        (governmentHost || /公式|ホームページ|市役所|区役所|町役場|村役場/.test(text));
      return identity ? `${current.origin}/` : "";
    } finally {
      clearTimeout(timer);
    }
  }
  return "";
}

async function save(rows: CsvRow[]) {
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCsv(row[header] ?? "")).join(",")),
  ];
  await writeFile(file, `${lines.join("\n")}\n`, "utf8");
}

async function main() {
  const rows = await readCsvFile(file);
  const requestedCodes = new Set(
    (process.env.URL_RESOLVER_CODES ?? "")
      .split(",")
      .filter(Boolean)
      .map((code) => code.slice(0, 5)),
  );
  const targets = rows.filter(
    (item) =>
      item.entityType === "municipality" &&
      !item.officialUrl &&
      (!requestedCodes.size || requestedCodes.has(item.municipalityCode.slice(0, 5))),
  );
  const concurrency = Math.max(1, Math.min(80, Number(process.env.URL_RESOLVER_CONCURRENCY ?? 32)));
  let cursor = 0;
  let found = 0;
  async function runner() {
    while (cursor < targets.length) {
      const item = targets[cursor];
      cursor += 1;
      const prefectureSlug = prefectureRoman[item.prefectureCode] ?? "";
      for (const candidate of candidates(item, prefectureSlug)) {
        try {
          const officialUrl = await fetchIdentity(candidate, item.name);
          if (officialUrl) {
            item.officialUrl = officialUrl;
            item.sourceUrl = officialUrl;
            found += 1;
            console.log(`確定 ${item.municipalityCode} ${item.name}: ${officialUrl}`);
            break;
          }
        } catch (error) {
          if (process.env.URL_RESOLVER_DEBUG === "1") {
            console.log(
              `候補失敗 ${candidate}: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
          // DNS不在、タイムアウト、SSRF拒否は次の候補へ進む。
        }
      }
      if (!item.officialUrl && process.env.URL_RESOLVER_SEARCH === "1") {
        try {
          const discovered = await searchCandidates(item);
          for (const candidate of discovered) {
            const officialUrl = await fetchIdentity(
              candidate,
              item.name,
              true,
              slug(item.nameKana, item.municipalityType),
            );
            if (!officialUrl) continue;
            item.officialUrl = officialUrl;
            item.sourceUrl = officialUrl;
            found += 1;
            console.log(`検索確定 ${item.municipalityCode} ${item.name}: ${officialUrl}`);
            break;
          }
        } catch (error) {
          if (process.env.URL_RESOLVER_DEBUG === "1") {
            console.log(
              `検索失敗 ${item.name}: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
      }
      const done = cursor;
      if (done % 100 === 0) {
        await save(rows);
        console.log(`進捗 ${Math.min(done, targets.length)}/${targets.length} / 新規確定 ${found}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, () => runner()));
  await save(rows);
  console.log(
    `公式URL確定: 新規${found}件 / 登録済み合計${rows.filter((item) => item.entityType === "municipality" && item.officialUrl).length}件`,
  );
}
main().catch((error: unknown) => {
  console.error(`エラー: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
