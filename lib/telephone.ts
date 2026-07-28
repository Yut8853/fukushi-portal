export function telephoneHref(value: string): string {
  return `tel:${value.replace(/[^\d+#*]/g, "")}`;
}

export function telephoneAriaLabel(value: string, label = ""): string {
  const spokenNumber = value
    .split(/[- ]/)
    .map((part) => [...part].join(" "))
    .join("、");
  return `${label ? `${label}、` : ""}電話番号 ${spokenNumber}へ電話`;
}
