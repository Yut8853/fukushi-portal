import type { MetadataRoute } from "next";
import { getPublicPortalData } from "@/lib/data/repository";
import { officeContactType } from "@/lib/support-routing";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://fukushi.junkbranding.com";
  const data = await getPublicPortalData();
  const latestVerifiedAt = [
    ...data.municipalities, ...data.offices, ...data.programs, ...data.sources,
  ].map((item) => item.lastVerifiedAt).filter(Boolean).sort().at(-1);
  const updated = latestVerifiedAt ? new Date(latestVerifiedAt) : undefined;
  const officesByMunicipality = new Map<string, typeof data.offices>();
  for (const office of data.offices) {
    const current = officesByMunicipality.get(office.municipalityId) ?? [];
    current.push(office);
    officesByMunicipality.set(office.municipalityId, current);
  }
  return [
    { url: siteUrl, lastModified: updated, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/support`, lastModified: updated, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/about`, lastModified: updated, changeFrequency: "monthly", priority: 0.4 },
    { url: `${siteUrl}/corrections`, lastModified: updated, changeFrequency: "monthly", priority: 0.3 },
    ...data.prefectures.map((prefecture) => ({
      url: `${siteUrl}/support/${prefecture.code}`,
      lastModified: updated,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...data.municipalities.flatMap((municipality) =>
      data.categories
        .filter((category) => {
          const local = officesByMunicipality.get(municipality.id) ?? [];
          if (category.id !== "violence") return local.length > 0;
          return local.some((office) =>
            office.categoryId === "violence" && officeContactType(office) !== "representative");
        })
        .map((category) => ({
        url: `${siteUrl}/support/${municipality.id}/${category.id}`,
        lastModified: municipality.lastVerifiedAt ? new Date(municipality.lastVerifiedAt) : updated,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      })),
    ),
  ];
}
