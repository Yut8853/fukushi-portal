type MergeableOffice = {
  phone: string;
  email: string;
  contactFormUrl: string;
  name: string;
  plainName: string;
  description: string;
};

function mergeKey(office: MergeableOffice): string {
  const phone = office.phone.replace(/\D/g, "");
  if (phone) return `phone:${phone}`;
  const email = office.email.trim().toLowerCase();
  if (email) return `email:${email}`;
  const contactFormUrl = office.contactFormUrl.trim().replace(/\/+$/, "");
  return contactFormUrl ? `form:${contactFormUrl}` : "";
}

export function mergeOfficesByContact<T extends MergeableOffice>(offices: T[]): T[] {
  const indexes = new Map<string, number>();
  const merged: T[] = [];
  offices.forEach((item) => {
    const key = mergeKey(item);
    if (!key || !indexes.has(key)) {
      if (key) indexes.set(key, merged.length);
      merged.push({ ...item });
      return;
    }
    const index = indexes.get(key)!;
    const preferred = merged[index];
    const preferredLabel = preferred.plainName || preferred.name;
    const alternateLabel = item.plainName || item.name;
    if (alternateLabel === preferredLabel || preferred.description.includes(alternateLabel)) return;
    const note = `同じ連絡先で「${alternateLabel}」の案内にも対応しています。`;
    merged[index] = {
      ...preferred,
      description: preferred.description ? `${preferred.description} ${note}` : note,
    };
  });
  return merged;
}
