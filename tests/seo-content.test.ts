import assert from "node:assert/strict";
import test from "node:test";
import { seoCategoryContent } from "../lib/seo-content";

const detailedCategoryIds = [
  "food",
  "housing",
  "rent",
  "utilities",
  "money",
  "medical",
  "work",
  "debt",
  "children",
  "disability",
  "care",
  "unknown",
];

test("非センシティブカテゴリは行動・制度・持ち物・関連ケースを備える", () => {
  for (const categoryId of detailedCategoryIds) {
    const content = seoCategoryContent(categoryId);
    assert.ok(content.firstSteps && content.firstSteps.length >= 3, categoryId);
    assert.ok(content.supportOptions && content.supportOptions.length >= 3, categoryId);
    assert.ok(content.whatToPrepare && content.whatToPrepare.length >= 4, categoryId);
    assert.ok(content.relatedCases && content.relatedCases.length >= 3, categoryId);
  }
});

test("安全配慮が必要なカテゴリは一般カテゴリの詳細テンプレートへ入れない", () => {
  for (const categoryId of ["violence", "mental"]) {
    const content = seoCategoryContent(categoryId);
    assert.equal(content.firstSteps, undefined);
    assert.equal(content.relatedCases, undefined);
  }
});
