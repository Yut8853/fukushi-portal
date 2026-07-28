export const SENSITIVE_CATEGORY_IDS = new Set(["violence", "mental"]);

export function isSensitiveCategory(categoryId: string): boolean {
  return SENSITIVE_CATEGORY_IDS.has(categoryId);
}

export const sensitiveSupportMetadata = {
  title: "相談先を確認",
  description: "地域の公的な相談先と、いま取れる行動を確認できます。",
} as const;
