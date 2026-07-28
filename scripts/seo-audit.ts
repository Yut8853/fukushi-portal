import { getPublicPortalData } from "@/lib/data/repository";
import { selectOffices } from "@/lib/support-routing";
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
  const prefectureOffices = new Map<string, typeof data.offices>();
  const nationalOffices = data.offices.filter((office) => office.scope === "national");
  for (const office of data.offices) {
    const map =
      office.scope === "prefecture"
        ? prefectureOffices
        : office.scope === "municipality"
          ? localOffices
          : null;
    const key = office.scope === "prefecture" ? office.prefectureCode : office.municipalityId;
    if (!map || !key) continue;
    map.set(key, [...(map.get(key) ?? []), office]);
  }
  let indexablePages = 0;
  for (const municipality of data.municipalities) {
    const scopedOffices = [
      ...(localOffices.get(municipality.id) ?? []),
      ...(prefectureOffices.get(municipality.prefectureCode) ?? []),
      ...nationalOffices,
    ];
    for (const category of data.categories) {
      const indexable =
        selectOffices(
          scopedOffices,
          municipality.id,
          category.id,
          municipality.representativePhone,
          municipality.prefectureCode,
        ).length > 0;
      if (indexable) indexablePages += 1;
      else errors.push(`検索着地ページに窓口なし: ${municipality.id}/${category.id}`);
    }
  }
  const expectedPages = data.municipalities.length * data.categories.length;
  if (indexablePages !== expectedPages) {
    errors.push(`検索着地ページ不足: ${indexablePages}/${expectedPages}`);
  }
  console.log(`SEO監査: ${data.prefectures.length}都道府県 / ${data.municipalities.length}自治体`);
  console.log(`インデックス対象: ${indexablePages}ページ`);
  console.log(`カテゴリーハブ: ${data.categories.length}ページ`);
  console.log(`エラー: ${errors.length}件`);
  for (const error of errors) console.error(`- ${error}`);
  if (errors.length) process.exitCode = 1;
}

void main();
