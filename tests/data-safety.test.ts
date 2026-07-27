import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { parseCsv } from "../lib/csv";
import { getCsvPortalData } from "../lib/data/repository";
import { categorySchema } from "../lib/data/schemas";

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
