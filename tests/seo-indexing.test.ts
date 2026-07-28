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
    reservationRequired: null,
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

test("全国・都道府県共通窓口が3件あってもnoindexにする", () => {
  assert.equal(
    isIndexableSupportPage(
      [
        office({ id: "1", scope: "national", municipalityId: "" }),
        office({ id: "2", scope: "prefecture", municipalityId: "" }),
        office({ id: "3", scope: "prefecture", municipalityId: "" }),
      ],
      "city",
      "money",
    ),
    false,
  );
});

test("自治体固有で連絡可能な専門窓口があればindex対象にする", () => {
  assert.equal(isIndexableSupportPage([office()], "city", "money"), true);
});

test("別カテゴリの自治体固有窓口が表示されてもindex対象にしない", () => {
  assert.equal(isIndexableSupportPage([office({ categoryId: "rent" })], "city", "money"), false);
});

test("自治体代表しかないページはnoindexにする", () => {
  assert.equal(
    isIndexableSupportPage([office({ contactType: "representative" })], "city", "money"),
    false,
  );
});

test("自治体固有でも連絡手段がなければnoindexにする", () => {
  assert.equal(
    isIndexableSupportPage(
      [office({ phone: "", address: "", contactFormUrl: "", email: "" })],
      "city",
      "money",
    ),
    false,
  );
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
