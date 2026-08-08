import type { MetadataRoute } from "next";
import { getPublicPortalData } from "@/lib/data/repository";
import { SITE_CONTENT_LAST_MODIFIED, SITE_URL } from "@/lib/site";
import {
  buildOfficeIndex,
  indexableMunicipalitiesFor,
  selectedOfficesFor,
} from "@/lib/seo-analysis";
import { isIndexableSupportPage } from "@/lib/seo-indexing";
import { GUIDE_CONTENT } from "@/lib/guide-content";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await getPublicPortalData();
  const dateFrom = (...values: string[]) => {
    const latest = values.filter(Boolean).sort().at(-1);
    return latest ? new Date(latest) : undefined;
  };
  const contentUpdated = new Date(SITE_CONTENT_LAST_MODIFIED);
  const officeIndex = buildOfficeIndex(data.offices);
  return [
    { url: SITE_URL, lastModified: contentUpdated, changeFrequency: "weekly", priority: 1 },
    {
      url: `${SITE_URL}/support`,
      lastModified: contentUpdated,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/guide`,
      lastModified: contentUpdated,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/data`,
      lastModified: contentUpdated,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    ...GUIDE_CONTENT.map((guide) => ({
      url: `${SITE_URL}/guide/${guide.slug}`,
      lastModified: contentUpdated,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
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
    {
      url: `${SITE_URL}/accessibility`,
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
      data.prefectures.flatMap((prefecture) =>
        indexableMunicipalitiesFor(data, officeIndex, prefecture.code, category.id).length
          ? [
              {
                url: `${SITE_URL}/support/category/${category.id}/${prefecture.code}`,
                lastModified: dateFrom(
                  SITE_CONTENT_LAST_MODIFIED,
                  ...data.municipalities
                    .filter((item) => item.prefectureCode === prefecture.code)
                    .map((item) => item.lastVerifiedAt),
                ),
                changeFrequency: "monthly" as const,
                priority: 0.75,
              },
            ]
          : [],
      ),
    ),
    ...data.municipalities.flatMap((municipality) =>
      data.categories
        .filter((category) => {
          const selected = selectedOfficesFor(officeIndex, municipality, category.id);
          return isIndexableSupportPage(selected, municipality.id, category.id);
        })
        .map((category) => ({
          url: `${SITE_URL}/support/${municipality.id}/${category.id}`,
          lastModified: dateFrom(
            SITE_CONTENT_LAST_MODIFIED,
            municipality.lastVerifiedAt,
            ...selectedOfficesFor(officeIndex, municipality, category.id).map(
              (office) => office.lastVerifiedAt,
            ),
          ),
          changeFrequency: "monthly" as const,
          priority: 0.7,
        })),
    ),
  ];
}
