import type { MetadataRoute } from "next";
import { getPublicPortalData } from "@/lib/data/repository";
import { SITE_URL } from "@/lib/site";
import { officeContactType } from "@/lib/support-routing";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await getPublicPortalData();
  const latestVerifiedAt = [
    ...data.municipalities,
    ...data.offices,
    ...data.programs,
    ...data.sources,
  ]
    .map((item) => item.lastVerifiedAt)
    .filter(Boolean)
    .sort()
    .at(-1);
  const updated = latestVerifiedAt ? new Date(latestVerifiedAt) : undefined;
  const officesByMunicipality = new Map<string, typeof data.offices>();
  for (const office of data.offices) {
    const current = officesByMunicipality.get(office.municipalityId) ?? [];
    current.push(office);
    officesByMunicipality.set(office.municipalityId, current);
  }
  return [
    { url: SITE_URL, lastModified: updated, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/support`, lastModified: updated, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/about`, lastModified: updated, changeFrequency: "monthly", priority: 0.4 },
    {
      url: `${SITE_URL}/corrections`,
      lastModified: updated,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    ...data.prefectures.map((prefecture) => ({
      url: `${SITE_URL}/support/${prefecture.code}`,
      lastModified: updated,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...data.municipalities.flatMap((municipality) =>
      data.categories
        .filter((category) => {
          const local = officesByMunicipality.get(municipality.id) ?? [];
          if (category.id !== "violence") return local.length > 0;
          return local.some(
            (office) =>
              office.categoryId === "violence" && officeContactType(office) !== "representative",
          );
        })
        .map((category) => ({
          url: `${SITE_URL}/support/${municipality.id}/${category.id}`,
          lastModified: municipality.lastVerifiedAt
            ? new Date(municipality.lastVerifiedAt)
            : updated,
          changeFrequency: "monthly" as const,
          priority: 0.7,
        })),
    ),
  ];
}
