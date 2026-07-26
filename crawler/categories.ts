export const crawlCategories = [
  ["public_assistance", ["生活保護"]],
  ["self_reliance", ["生活困窮", "自立相談支援"]],
  ["housing_benefit", ["住居確保給付金"]],
  ["welfare_office", ["福祉事務所"]],
  ["social_welfare_council", ["社会福祉協議会", "社協"]],
  ["food_support", ["食料支援", "フードバンク", "食糧支援"]],
  ["emergency_housing", ["緊急宿泊", "一時宿泊", "シェルター", "居住支援"]],
  ["disability", ["障害福祉", "自立支援医療"]],
  ["mental_health", ["こころの相談", "心の相談", "精神保健"]],
  ["children", ["子育て相談", "妊娠", "出産支援"]],
  ["single_parent", ["ひとり親", "母子家庭", "父子家庭"]],
  ["elderly_care", ["高齢者相談", "介護相談", "地域包括支援"]],
  ["violence", ["DV相談", "ＤＶ相談", "性暴力"]],
  ["child_abuse", ["児童虐待", "虐待相談"]],
  ["debt_legal", ["多重債務", "法律相談"]],
  ["foreign_residents", ["外国人相談", "多言語相談"]],
  ["reductions", ["減免", "保険料免除", "支払相談"]],
  ["local_benefit", ["給付金", "生活支援制度"]],
  ["disaster_recovery", ["生活再建支援", "被災者支援"]],
] as const;

export type CrawlCategoryId = (typeof crawlCategories)[number][0];

const portalCategoryMap: Record<CrawlCategoryId, string> = {
  public_assistance: "money",
  self_reliance: "housing",
  housing_benefit: "rent",
  welfare_office: "money",
  social_welfare_council: "unknown",
  food_support: "food",
  emergency_housing: "housing",
  disability: "disability",
  mental_health: "mental",
  children: "children",
  single_parent: "children",
  elderly_care: "care",
  violence: "violence",
  child_abuse: "violence",
  debt_legal: "debt",
  foreign_residents: "unknown",
  reductions: "money",
  local_benefit: "money",
  disaster_recovery: "housing",
};

export function toPortalCategory(id: CrawlCategoryId): string {
  return portalCategoryMap[id];
}

export function classify(text: string): { id: CrawlCategoryId; score: number }[] {
  return crawlCategories.map(([id, keywords]) => ({
    id,
    score: keywords.reduce((score, keyword) => score + (text.includes(keyword) ? 1 : 0), 0),
  })).filter((item) => item.score > 0).sort((a, b) => b.score - a.score);
}
