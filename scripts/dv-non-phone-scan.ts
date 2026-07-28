import { writeFile } from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";
import iconv from "iconv-lite";
import { readCsvFile } from "../lib/csv";

type Candidate = {
  officeId: string;
  officeName: string;
  sourcePage: string;
  kind: "email" | "form-or-sns";
  label: string;
  value: string;
};

const relevant = /DV|ＤＶ|配偶者|暴力|女性|相談|メール|SNS|ＳＮＳ|チャット|LINE|ライン/i;
const routeLike = /form|mail|soudan|sodan|consult|chat|line|toiawase|contact/i;

async function fetchHtml(url: string): Promise<{ html: string; finalUrl: string } | null> {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
      headers: { "user-agent": "fukushi-portal-source-monitor/1.0" },
    });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    const charset = contentType
      .match(/charset=([^;\s]+)/i)?.[1]
      ?.replaceAll('"', "")
      .toLowerCase();
    const html =
      charset && /shift_jis|shift-jis|sjis|windows-31j/.test(charset)
        ? iconv.decode(bytes, "Shift_JIS")
        : bytes.toString("utf8");
    return { html, finalUrl: response.url };
  } catch {
    return null;
  }
}

function absoluteUrl(value: string, base: string): string {
  try {
    return new URL(value, base).toString();
  } catch {
    return "";
  }
}

async function main(): Promise<void> {
  const offices = (await readCsvFile(path.join(process.cwd(), "data/offices.csv"))).filter(
    (office) =>
      office.status === "published" &&
      office.scope === "prefecture" &&
      office.categoryId === "violence",
  );
  const candidates: Candidate[] = [];

  for (const office of offices) {
    const first = await fetchHtml(office.officialUrl);
    if (!first) continue;
    const queue = [{ ...first, depth: 0 }];
    const seen = new Set<string>();
    while (queue.length) {
      const page = queue.shift()!;
      if (seen.has(page.finalUrl)) continue;
      seen.add(page.finalUrl);
      const $ = cheerio.load(page.html);
      const context = `${$("title").text()} ${$("h1").first().text()} ${$("main").text()}`.slice(
        0,
        80_000,
      );
      if (!relevant.test(context)) continue;

      $("a[href]").each((_, element) => {
        const href = ($(element).attr("href") ?? "").trim();
        const label = $(element).text().replace(/\s+/g, " ").trim();
        if (href.toLowerCase().startsWith("mailto:")) {
          candidates.push({
            officeId: office.id,
            officeName: office.name,
            sourcePage: page.finalUrl,
            kind: "email",
            label,
            value: href.slice(7).split("?")[0],
          });
          return;
        }
        const target = absoluteUrl(href, page.finalUrl);
        if (!target || !relevant.test(`${label} ${href}`) || !routeLike.test(`${label} ${href}`)) {
          return;
        }
        candidates.push({
          officeId: office.id,
          officeName: office.name,
          sourcePage: page.finalUrl,
          kind: "form-or-sns",
          label,
          value: target,
        });
      });

      $("form[action]").each((_, element) => {
        const label = $(element).text().replace(/\s+/g, " ").trim().slice(0, 160);
        const target = absoluteUrl($(element).attr("action") ?? "", page.finalUrl);
        if (!target || !relevant.test(`${context.slice(0, 2_000)} ${label}`)) return;
        candidates.push({
          officeId: office.id,
          officeName: office.name,
          sourcePage: page.finalUrl,
          kind: "form-or-sns",
          label: label || "相談入力フォーム",
          value: target,
        });
      });

      if (page.depth === 0) {
        const related = $("a[href]")
          .toArray()
          .map((element) => ({
            label: $(element).text().replace(/\s+/g, " ").trim(),
            url: absoluteUrl($(element).attr("href") ?? "", page.finalUrl),
          }))
          .filter(({ label, url }) => url && relevant.test(`${label} ${url}`))
          .slice(0, 8);
        for (const link of related) {
          const next = await fetchHtml(link.url);
          if (next) queue.push({ ...next, depth: 1 });
        }
      }
    }
  }

  const unique = [
    ...new Map(
      candidates
        .filter((candidate) => candidate.value && !/javascript:|#$/i.test(candidate.value))
        .map((candidate) => [
          `${candidate.officeId}:${candidate.kind}:${candidate.value}`,
          candidate,
        ]),
    ).values(),
  ];
  const output = path.join(process.cwd(), "data/crawl/dv-non-phone-candidates.json");
  await writeFile(
    output,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        scannedOffices: offices.length,
        officesWithCandidates: new Set(unique.map((candidate) => candidate.officeId)).size,
        candidates: unique,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`DV窓口を走査: ${offices.length}件`);
  console.log(`候補あり: ${new Set(unique.map((candidate) => candidate.officeId)).size}件`);
  console.log(`候補: ${unique.length}件`);
  console.log(output);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
