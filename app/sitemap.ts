import type { MetadataRoute } from "next";
import { getPublicPortalData } from "@/lib/data/repository";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://fukushi.junkbranding.com";
  const data = await getPublicPortalData();
  const updated = new Date();
  return [
    { url: siteUrl, lastModified: updated, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/about`, lastModified: updated, changeFrequency: "monthly", priority: 0.4 },
    { url: `${siteUrl}/corrections`, lastModified: updated, changeFrequency: "monthly", priority: 0.3 },
    ...data.municipalities.flatMap((municipality) =>
      data.categories.map((category) => ({
        url: `${siteUrl}/support/${municipality.id}/${category.id}`,
        lastModified: municipality.lastVerifiedAt ? new Date(municipality.lastVerifiedAt) : updated,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      })),
    ),
  ];
}
