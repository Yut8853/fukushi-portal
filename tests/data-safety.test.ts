import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { parseCsv } from "../lib/csv";
import { getCsvPortalData } from "../lib/data/repository";
import { categorySchema } from "../lib/data/schemas";
import { selectOffices } from "../lib/support-routing";

test("CSVの列数不足を拒否する", () => {
  assert.throws(
    () => parseCsv("id,label,sortOrder\nchildren,子ども,10,extra\n"),
    /列数が3ではなく4/,
  );
});

test("数字だけの電話台本と空の並び順を拒否する", () => {
  assert.equal(
    categorySchema.safeParse({
      id: "children",
      label: "子ども",
      description: "",
      consultationScript: "10",
      sortOrder: "",
    }).success,
    false,
  );
});

test("公開データの電話台本・窓口メタデータ・管轄条件を維持する", async () => {
  const data = await getCsvPortalData(path.join(process.cwd(), "data"));
  const children = data.categories.find((item) => item.id === "children");
  assert.ok(children);
  assert.notEqual(children.consultationScript, "10");
  assert.match(children.consultationScript, /子育て|妊娠|ひとり親/);

  assert.equal(
    data.offices.some((office) => !office.contactType || !office.verificationLevel),
    false,
  );

  const groups = new Map<string, typeof data.offices>();
  data.offices
    .filter((office) => office.status === "published" && office.contactType === "direct")
    .forEach((office) => {
      const key = `${office.municipalityId}:${office.categoryId}`;
      const group = groups.get(key) ?? [];
      group.push(office);
      groups.set(key, group);
    });
  const ambiguous = [...groups.values()].filter(
    (group) => group.length > 1 && group.some((office) => !office.serviceArea),
  );
  assert.equal(ambiguous.length, 0);
});

test("自治体代表電話を複数自治体へ転用しない", async () => {
  const data = await getCsvPortalData(path.join(process.cwd(), "data"));
  const normalized = (value: string) => value.replace(/\D/g, "");
  const representativePhones = data.municipalities
    .filter((municipality) => municipality.status === "published")
    .map((municipality) => normalized(municipality.representativePhone))
    .filter(Boolean);
  assert.equal(new Set(representativePhones).size, representativePhones.length);

  const generalPhones = data.offices
    .filter(
      (office) =>
        office.status === "published" &&
        office.scope === "municipality" &&
        office.id.endsWith("-city-general") &&
        Boolean(office.phone),
    )
    .map((office) => normalized(office.phone));
  assert.equal(new Set(generalPhones).size, generalPhones.length);
});

test("全自治体でDVの地域相談窓口を1件以上表示する", async () => {
  const data = await getCsvPortalData(path.join(process.cwd(), "data"));
  const prefectureDvCenters = data.offices.filter(
    (office) =>
      office.status === "published" &&
      office.scope === "prefecture" &&
      office.categoryId === "violence",
  );
  assert.equal(new Set(prefectureDvCenters.map((office) => office.prefectureCode)).size, 47);

  const uncovered = data.municipalities.filter(
    (municipality) =>
      municipality.status === "published" &&
      selectOffices(
        data.offices,
        municipality.id,
        "violence",
        municipality.representativePhone,
        municipality.prefectureCode,
      ).length === 0,
  );
  assert.deepEqual(uncovered, []);
});

test("全自治体の食料相談で電話以外の連絡先を1件以上表示する", async () => {
  const data = await getCsvPortalData(path.join(process.cwd(), "data"));
  const uncovered = data.municipalities.filter((municipality) => {
    if (municipality.status !== "published") return false;
    const offices = selectOffices(
      data.offices,
      municipality.id,
      "food",
      municipality.representativePhone,
      municipality.prefectureCode,
    );
    return !offices.some((office) => office.fax || office.email || office.contactFormUrl);
  });

  assert.deepEqual(uncovered, []);
});

test("確認済みの都道府県DV窓口で地域の非通話相談経路を表示する", async () => {
  const data = await getCsvPortalData(path.join(process.cwd(), "data"));
  const alternatives = data.offices.filter(
    (office) =>
      office.status === "published" &&
      office.scope === "prefecture" &&
      office.categoryId === "violence" &&
      Boolean(office.email || office.fax || office.contactFormUrl),
  );

  assert.equal(alternatives.length >= 11, true);
  assert.equal(
    alternatives.every((office) => office.verificationLevel === "human_verified"),
    true,
  );
});

test("全都道府県で児童相談所・消費生活センター・法テラスを表示する", async () => {
  const data = await getCsvPortalData(path.join(process.cwd(), "data"));
  const expectedIds = [
    "prefecture-child-guidance-center-",
    "prefecture-consumer-center-",
    "prefecture-legal-aid-",
  ];

  for (const idPrefix of expectedIds) {
    const offices = data.offices.filter(
      (office) => office.status === "published" && office.id.startsWith(idPrefix),
    );
    assert.equal(offices.length, 47, `${idPrefix}の件数`);
    assert.equal(new Set(offices.map((office) => office.prefectureCode)).size, 47);
    assert.equal(
      offices.every((office) => office.scope === "prefecture"),
      true,
    );
    assert.equal(
      offices.every((office) => Boolean(office.serviceArea)),
      true,
    );
    assert.equal(
      offices.every((office) => Boolean(office.eligibilityConditions)),
      true,
    );
  }
});

test("都道府県の借金相談に電話以外の相談経路を含める", async () => {
  const data = await getCsvPortalData(path.join(process.cwd(), "data"));
  const uncovered = data.municipalities.filter((municipality) => {
    if (municipality.status !== "published") return false;
    const offices = selectOffices(
      data.offices,
      municipality.id,
      "debt",
      municipality.representativePhone,
      municipality.prefectureCode,
    );
    return !offices.some((office) => office.email || office.fax || office.contactFormUrl);
  });

  assert.deepEqual(uncovered, []);
});
