import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { selectOffices } from "../lib/support-routing";
import type { Office } from "../lib/data/schemas";

const office = (values: Partial<Office>): Office => ({
  id: "office",
  municipalityId: "city",
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

test("検索クライアントはカテゴリをAPIへ送信しない", async () => {
  const root = process.cwd();
  const finder = await readFile(path.join(root, "components", "SupportFinder.tsx"), "utf8");
  assert.doesNotMatch(finder, /\/api\/support\?/);
  assert.match(finder, /\/data\/support\/\$\{dataFile\}\.json/);
  await assert.rejects(access(path.join(root, "app", "api", "support", "route.ts")));
});
