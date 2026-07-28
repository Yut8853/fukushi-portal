import type { MetadataRoute } from "next";
import { getPublicPortalData } from "@/lib/data/repository";
import { SITE_URL } from "@/lib/site";
import { selectOffices } from "@/lib/support-routing";

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
  const localOffices = new Map<string, typeof data.offices>();
  const prefectureOffices = new Map<string, typeof data.offices>();
  const nationalOffices = data.offices.filter((office) => office.scope === "national");
  for (const office of data.offices) {
    const map =
      office.scope === "prefecture"
        ? prefectureOffices
        : office.scope === "municipality"
          ? localOffices
          : null;
    const key = office.scope === "prefecture" ? office.prefectureCode : office.municipalityId;
    if (!map || !key) continue;
    map.set(key, [...(map.get(key) ?? []), office]);
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
    ...data.categories.map((category) => ({
      url: `${SITE_URL}/support/category/${category.id}`,
      lastModified: updated,
      changeFrequency: "monthly" as const,
      priority: 0.85,
    })),
    ...data.municipalities.flatMap((municipality) =>
      data.categories
        .filter((category) => {
          const scopedOffices = [
            ...(localOffices.get(municipality.id) ?? []),
            ...(prefectureOffices.get(municipality.prefectureCode) ?? []),
            ...nationalOffices,
          ];
          return (
            selectOffices(
              scopedOffices,
              municipality.id,
              category.id,
              municipality.representativePhone,
              municipality.prefectureCode,
            ).length > 0
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
