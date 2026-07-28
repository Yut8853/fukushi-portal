import assert from "node:assert/strict";
import test from "node:test";
import type { Office } from "../lib/data/schemas";
import { isIndexableSupportPage } from "../lib/seo-indexing";

function office(overrides: Partial<Office> = {}): Office {
  return {
    id: "office",
    municipalityId: "city",
    categoryId: "money",
    name: "相談窓口",
    plainName: "生活相談",
    department: "",
    description: "",
    postalCode: "",
    address: "",
    phone: "03-0000-0000",
    fax: "",
    email: "",
    contactFormUrl: "",
    officialUrl: "https://example.go.jp",
    openingHours: "",
    closedDays: "",
    reservationRequired: "",
    availableMethods: "電話",
    accessibility: "",
    languages: "",
    emergencyAlternative: "",
    serviceArea: "市内",
    eligibilityConditions: "市内在住者",
    sourceId: "source",
    status: "published",
    lastVerifiedAt: "2026-07-28",
    contactType: "direct",
    verificationLevel: "human_verified",
    scope: "municipality",
    prefectureCode: "",
    ...overrides,
  };
}

test("窓口3件以上の案内ページをindex対象にする", () => {
  assert.equal(
    isIndexableSupportPage(
      [office({ id: "1" }), office({ id: "2" }), office({ id: "3" })],
      "city",
      "money",
    ),
    true,
  );
});

test("薄いページでも自治体固有の専門窓口があればindex対象にする", () => {
  assert.equal(isIndexableSupportPage([office()], "city", "money"), true);
});

test("都道府県共通窓口だけの薄いページはnoindexにする", () => {
  assert.equal(
    isIndexableSupportPage(
      [office({ scope: "prefecture", municipalityId: "", prefectureCode: "13" })],
      "city",
      "money",
    ),
    false,
  );
});
