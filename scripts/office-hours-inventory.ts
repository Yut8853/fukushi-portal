import { getPublicPortalData } from "../lib/data/repository";
import { officeContactType } from "../lib/support-routing";

async function main() {
  const data = await getPublicPortalData();
  const sourceUrls = new Map(data.sources.map((source) => [source.id, source.url]));
  const missing = data.offices.filter((office) => !office.openingHours);
  const byType = new Map<string, number>();
  const byDomain = new Map<string, { offices: number; urls: Set<string> }>();
  const uniqueUrls = new Set<string>();
  const withoutSource = [];

  for (const office of missing) {
    const type = officeContactType(office);
    byType.set(type, (byType.get(type) ?? 0) + 1);
    const sourceUrl = office.officialUrl || sourceUrls.get(office.sourceId) || "";
    if (!sourceUrl) {
      withoutSource.push(office.id);
      continue;
    }
    uniqueUrls.add(sourceUrl);
    const domain = new URL(sourceUrl).hostname;
    const group = byDomain.get(domain) ?? { offices: 0, urls: new Set<string>() };
    group.offices += 1;
    group.urls.add(sourceUrl);
    byDomain.set(domain, group);
  }

  console.log(`受付時間未登録: ${missing.length}件`);
  console.log(`情報源なし: ${withoutSource.length}件`);
  console.log(`公式URL: ${uniqueUrls.size}件 / ドメイン: ${byDomain.size}件`);
  console.log("\n窓口種別:");
  for (const [type, count] of [...byType].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}件`);
  }
  console.log("\n情報源ドメイン（上位30件）:");
  for (const [domain, value] of [...byDomain].sort((a, b) => b[1].offices - a[1].offices).slice(0, 30)) {
    console.log(`  ${domain}: ${value.offices}窓口 / ${value.urls.size} URL`);
  }
}

void main();
