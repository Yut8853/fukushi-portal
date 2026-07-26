import path from "node:path";
import { readCsvFile } from "../lib/csv";

export type CrawlMunicipality = {
  id: string;
  prefectureCode: string;
  municipalityCode: string;
  name: string;
  nameKana: string;
  municipalityType: string;
  entityType: "municipality" | "administrative_ward" | "special_territory" | "aggregate";
  lifecycleStatus: "current" | "abolished";
  officialUrl: string;
};

function baseCode(code: string): string {
  return code.replace(/\D/g, "").slice(0, 5);
}

export async function loadCrawlMunicipalities(): Promise<CrawlMunicipality[]> {
  const existing = await readCsvFile(path.join(process.cwd(), "data", "municipalities.csv"));
  const nationwide = await readCsvFile(path.join(process.cwd(), "data", "nationwide-municipalities.csv"))
    .catch(() => []);
  const byCode = new Map<string, CrawlMunicipality>();
  for (const item of nationwide) {
    byCode.set(baseCode(item.municipalityCode), item as CrawlMunicipality);
  }
  for (const item of existing) {
    const key = baseCode(item.municipalityCode);
    const current = byCode.get(key);
    byCode.set(key, {
      id: item.id, prefectureCode: item.prefectureCode, municipalityCode: item.municipalityCode,
      name: item.name, nameKana: item.nameKana, municipalityType: item.municipalityType,
      entityType: "municipality", lifecycleStatus: "current",
      officialUrl: item.officialUrl || current?.officialUrl || "",
    });
  }
  return [...byCode.values()];
}

export function findByCode(items: CrawlMunicipality[], requested: string): CrawlMunicipality | undefined {
  const key = baseCode(requested);
  return items.find((item) => baseCode(item.municipalityCode) === key);
}
