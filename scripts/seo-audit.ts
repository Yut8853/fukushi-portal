import { getPublicPortalData } from "@/lib/data/repository";
import { officeContactType } from "@/lib/support-routing";
import { seoCategoryContent } from "@/lib/seo-content";

async function main() {
  const data = await getPublicPortalData();
  const errors: string[] = [];
  for (const category of data.categories) {
    const seo = seoCategoryContent(category.id);
    if (!seo.searchTitle || !seo.summary || !seo.firstAction || !seo.relatedTerms.length) {
      errors.push(`SEO文面不足: ${category.id}`);
    }
  }
  const localOffices = new Map<string, typeof data.offices>();
  for (const office of data.offices) {
    const list = localOffices.get(office.municipalityId) ?? [];
    list.push(office);
    localOffices.set(office.municipalityId, list);
  }
  let indexablePages = 0;
  for (const municipality of data.municipalities) {
    const offices = localOffices.get(municipality.id) ?? [];
    if (!offices.length) errors.push(`地域窓口なし: ${municipality.id}`);
    for (const category of data.categories) {
      const indexable = category.id !== "violence" || offices.some((office) =>
        office.categoryId === "violence" && officeContactType(office) !== "representative");
      if (indexable) indexablePages += 1;
    }
  }
  console.log(`SEO監査: ${data.prefectures.length}都道府県 / ${data.municipalities.length}自治体`);
  console.log(`インデックス対象: ${indexablePages}ページ`);
  console.log(`エラー: ${errors.length}件`);
  for (const error of errors) console.error(`- ${error}`);
  if (errors.length) process.exitCode = 1;
}

void main();
