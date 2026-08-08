import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { selectOffices } from "../lib/support-routing";
import { shouldEstimateMunicipalHours } from "../lib/office-hours";
import type { Office } from "../lib/data/schemas";

const office = (values: Partial<Office>): Office => ({
  id: "office",
  municipalityId: "city",
  scope: "municipality",
  prefectureCode: "",
  categoryId: "violence",
  name: "窓口",
  plainName: "相談窓口",
  department: "",
  description: "",
  postalCode: "",
  address: "",
  phone: "000-000-0000",
  fax: "",
  email: "",
  contactFormUrl: "",
  officialUrl: "",
  openingHours: "",
  closedDays: "",
  reservationRequired: null,
  availableMethods: "",
  accessibility: "",
  languages: "",
  emergencyAlternative: "",
  serviceArea: "",
  eligibilityConditions: "",
  contactType: "direct",
  verificationLevel: "primary_source_import",
  sourceId: "",
  status: "published",
  lastVerifiedAt: "2026-07-27",
  ...values,
});

test("DV検索では代表電話を返さない", () => {
  const direct = office({ id: "dv-direct" });
  const representative = office({
    id: "city-general",
    categoryId: "unknown",
    contactType: "representative",
  });
  assert.deepEqual(
    selectOffices([representative, direct], "city", "violence").map((item) => item.id),
    ["dv-direct"],
  );
});

test("都道府県窓口は同じ都道府県の全自治体へ継承する", () => {
  const prefectureOffice = office({
    id: "prefecture-dv",
    municipalityId: "",
    scope: "prefecture",
    prefectureCode: "13",
    serviceArea: "東京都内",
    eligibilityConditions: "東京都内に在住・在勤・在学する人",
  });
  assert.deepEqual(
    selectOffices([prefectureOffice], "tokyo-chiyoda", "violence", "", "13").map((item) => item.id),
    ["prefecture-dv"],
  );
  assert.deepEqual(selectOffices([prefectureOffice], "osaka-osaka", "violence", "", "27"), []);
});

test("全国窓口は全自治体へ継承するがDVの代表電話は返さない", () => {
  const nationwide = office({
    id: "national-dv",
    municipalityId: "",
    scope: "national",
    serviceArea: "全国",
  });
  const representative = office({
    id: "national-representative",
    municipalityId: "",
    scope: "national",
    categoryId: "unknown",
    contactType: "representative",
    serviceArea: "全国",
  });
  assert.deepEqual(
    selectOffices([representative, nationwide], "city", "violence", "", "01").map(
      (item) => item.id,
    ),
    ["national-dv"],
  );
});

test("受付時間の推定を都道府県・全国・専門直通窓口へ適用しない", () => {
  assert.equal(
    shouldEstimateMunicipalHours({ scope: "municipality", contactType: "representative" }),
    true,
  );
  assert.equal(
    shouldEstimateMunicipalHours({ scope: "municipality", contactType: "self-reliance" }),
    true,
  );
  assert.equal(
    shouldEstimateMunicipalHours({ scope: "municipality", contactType: "direct" }),
    false,
  );
  assert.equal(shouldEstimateMunicipalHours({ scope: "prefecture", contactType: "direct" }), false);
  assert.equal(shouldEstimateMunicipalHours({ scope: "national", contactType: "direct" }), false);
});

test("DV検索で同じ番号ならDV相談カードを児童虐待カードより優先する", () => {
  const childAbuse = office({ id: "city-child-abuse", plainName: "児童虐待相談" });
  const dv = office({ id: "city-dv", plainName: "DV相談" });
  const selected = selectOffices([childAbuse, dv], "city", "violence");
  assert.deepEqual(
    selected.map((item) => item.id),
    ["city-dv"],
  );
  assert.match(selected[0].description, /児童虐待相談/);
});

test("カテゴリ直通窓口と同じ番号の自立相談は説明へ統合する", () => {
  const direct = office({ id: "rent-direct", categoryId: "rent" });
  const selfReliance = office({
    id: "self-reliance",
    categoryId: "housing",
    plainName: "生活困窮者自立相談",
    contactType: "self-reliance",
  });
  const selected = selectOffices([direct, selfReliance], "city", "rent");
  assert.deepEqual(
    selected.map((item) => item.id),
    ["rent-direct"],
  );
  assert.match(selected[0].description, /生活困窮者自立相談/);
});

test("カテゴリ直通窓口と番号が違う自立相談は別の入口として残す", () => {
  const direct = office({ id: "public-assistance", categoryId: "money", phone: "000-000-0001" });
  const selfReliance = office({
    id: "self-reliance",
    categoryId: "housing",
    plainName: "生活困窮者自立相談",
    phone: "000-000-0002",
    contactType: "self-reliance",
  });
  assert.deepEqual(
    selectOffices([direct, selfReliance], "city", "money").map((item) => item.id),
    ["public-assistance", "self-reliance"],
  );
});

test("電話がなくても同じ問い合わせフォームの窓口を統合する", () => {
  const direct = office({
    id: "direct-form",
    categoryId: "money",
    phone: "",
    contactFormUrl: "https://example.jp/contact/",
  });
  const selfReliance = office({
    id: "self-reliance-form",
    categoryId: "housing",
    phone: "",
    contactFormUrl: "https://example.jp/contact",
    plainName: "生活困窮者自立相談",
    contactType: "self-reliance",
  });
  const selected = selectOffices([direct, selfReliance], "city", "money");
  assert.deepEqual(
    selected.map((item) => item.id),
    ["direct-form"],
  );
  assert.match(selected[0].description, /生活困窮者自立相談/);
});

test("同じ電話番号ではカテゴリ別のつなぎ依頼を一般代表より優先する", () => {
  const categoryFallback = office({
    id: "public-assistance-fallback",
    categoryId: "money",
    contactType: "representative",
  });
  const general = office({
    id: "city-general",
    categoryId: "unknown",
    plainName: "市役所の代表窓口",
    contactType: "representative",
  });
  const selected = selectOffices([general, categoryFallback], "city", "money");
  assert.deepEqual(
    selected.map((item) => item.id),
    ["public-assistance-fallback"],
  );
  assert.match(selected[0].description, /市役所の代表窓口/);
});

test("検索クライアントはカテゴリをAPIへ送信しない", async () => {
  const root = process.cwd();
  const finder = await readFile(path.join(root, "components", "SupportFinder.tsx"), "utf8");
  assert.doesNotMatch(finder, /\/api\/support\?/);
  assert.match(finder, /\/data\/support\/\$\{dataFile\}\.json/);
  await assert.rejects(access(path.join(root, "app", "api", "support", "route.ts")));
});

test("センシティブカテゴリをメタデータや共有タイトルへ露出しない", async () => {
  const root = process.cwd();
  const municipalityPage = await readFile(
    path.join(root, "app", "support", "[prefectureCode]", "[categoryId]", "page.tsx"),
    "utf8",
  );
  const finder = await readFile(path.join(root, "components", "SupportFinder.tsx"), "utf8");

  assert.match(municipalityPage, /sensitiveSupportMetadata\.title/);
  assert.match(municipalityPage, /index: !sensitive && indexable/);
  assert.match(finder, /isSensitiveCategory\(categoryId\)/);
  assert.match(finder, /くらし支援ナビの相談先案内/);
});
