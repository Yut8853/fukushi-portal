import type { MetadataRoute } from "next";
import { getPublicPortalData } from "@/lib/data/repository";
import { SITE_CONTENT_LAST_MODIFIED, SITE_URL } from "@/lib/site";
import { selectOffices } from "@/lib/support-routing";
import { isIndexableSupportPage } from "@/lib/seo-indexing";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await getPublicPortalData();
  const dateFrom = (...values: string[]) => {
    const latest = values.filter(Boolean).sort().at(-1);
    return latest ? new Date(latest) : undefined;
  };
  const contentUpdated = new Date(SITE_CONTENT_LAST_MODIFIED);
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
    { url: SITE_URL, lastModified: contentUpdated, changeFrequency: "weekly", priority: 1 },
    {
      url: `${SITE_URL}/support`,
      lastModified: contentUpdated,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: contentUpdated,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/corrections`,
      lastModified: contentUpdated,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/editorial-policy`,
      lastModified: contentUpdated,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    ...data.prefectures.map((prefecture) => ({
      url: `${SITE_URL}/support/${prefecture.code}`,
      lastModified: dateFrom(
        SITE_CONTENT_LAST_MODIFIED,
        ...data.municipalities
          .filter((item) => item.prefectureCode === prefecture.code)
          .map((item) => item.lastVerifiedAt),
      ),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...data.categories.map((category) => ({
      url: `${SITE_URL}/support/category/${category.id}`,
      lastModified: contentUpdated,
      changeFrequency: "monthly" as const,
      priority: 0.85,
    })),
    ...data.categories.flatMap((category) =>
      data.prefectures.map((prefecture) => ({
        url: `${SITE_URL}/support/category/${category.id}/${prefecture.code}`,
        lastModified: dateFrom(
          SITE_CONTENT_LAST_MODIFIED,
          ...data.municipalities
            .filter((item) => item.prefectureCode === prefecture.code)
            .map((item) => item.lastVerifiedAt),
        ),
        changeFrequency: "monthly" as const,
        priority: 0.75,
      })),
    ),
    ...data.municipalities.flatMap((municipality) =>
      data.categories
        .filter((category) => {
          const scopedOffices = [
            ...(localOffices.get(municipality.id) ?? []),
            ...(prefectureOffices.get(municipality.prefectureCode) ?? []),
            ...nationalOffices,
          ];
          const selected = selectOffices(
            scopedOffices,
            municipality.id,
            category.id,
            municipality.representativePhone,
            municipality.prefectureCode,
          );
          return isIndexableSupportPage(selected, municipality.id, category.id);
        })
        .map((category) => ({
          url: `${SITE_URL}/support/${municipality.id}/${category.id}`,
          lastModified: dateFrom(
            SITE_CONTENT_LAST_MODIFIED,
            municipality.lastVerifiedAt,
            ...selectOffices(
              [
                ...(localOffices.get(municipality.id) ?? []),
                ...(prefectureOffices.get(municipality.prefectureCode) ?? []),
                ...nationalOffices,
              ],
              municipality.id,
              category.id,
              municipality.representativePhone,
              municipality.prefectureCode,
            ).map((office) => office.lastVerifiedAt),
          ),
          changeFrequency: "monthly" as const,
          priority: 0.7,
        })),
    ),
  ];
}
