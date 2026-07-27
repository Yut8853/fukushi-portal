import { NextResponse } from "next/server";
import { getPublicPortalData } from "@/lib/data/repository";
import type { FinderOffice, FinderProgram } from "@/lib/data/view-models";
import { officeContactType, transferTarget } from "@/lib/support-routing";

export const dynamicParams = false;
export const revalidate = 86_400;

type RouteProps = {
  params: Promise<{ prefectureFile: string }>;
};

export async function generateStaticParams() {
  const data = await getPublicPortalData();
  return [
    { prefectureFile: "national.json" },
    ...data.prefectures.map((item) => ({ prefectureFile: `${item.code}.json` })),
  ];
}

export async function GET(_request: Request, { params }: RouteProps) {
  const { prefectureFile } = await params;
  const prefectureCode = prefectureFile.replace(/\.json$/, "");
  const data = await getPublicPortalData();
  const isNational = prefectureCode === "national";
  const prefecture = data.prefectures.find((item) => item.code === prefectureCode);
  if (!isNational && !prefecture) {
    return NextResponse.json({ error: "都道府県が見つかりません。" }, { status: 404 });
  }

  const municipalities = isNational
    ? []
    : data.municipalities.filter((item) => item.prefectureCode === prefectureCode);
  const municipalityIds = new Set(municipalities.map((item) => item.id));
  const municipalityMap = new Map(municipalities.map((item) => [item.id, item]));
  const sources = new Map(data.sources.map((source) => [source.id, source]));

  const programs: FinderProgram[] = data.programs
    .filter(
      (item) =>
        item.scope === "national" ||
        Boolean(item.municipalityId && municipalityIds.has(item.municipalityId)),
    )
    .map((program) => ({
      id: program.id,
      categoryId: program.categoryId,
      scope: program.scope,
      municipalityId: program.municipalityId,
      name: program.name,
      plainName: program.plainName,
      description: program.description,
      applicationFlow: program.applicationFlow,
      requiredDocuments: program.requiredDocuments.split("・").filter(Boolean),
      documentsOptionalNote: program.documentsOptionalNote,
      sourceTitle: sources.get(program.sourceId)?.title ?? "",
      sourceUrl: sources.get(program.sourceId)?.url ?? "",
      lastVerifiedAt: program.lastVerifiedAt,
    }));
  const offices: FinderOffice[] = data.offices
    .filter((office) => municipalityIds.has(office.municipalityId))
    .map((office) => {
      const municipality = municipalityMap.get(office.municipalityId);
      return {
        id: office.id,
        municipalityId: office.municipalityId,
        categoryId: office.categoryId,
        name: office.name,
        plainName: office.plainName,
        description: office.description,
        phone: office.phone,
        officialUrl: office.officialUrl,
        openingHours: office.openingHours,
        closedDays: office.closedDays,
        availableMethods: office.availableMethods,
        address: office.address,
        serviceArea: office.serviceArea,
        eligibilityConditions: office.eligibilityConditions,
        lastVerifiedAt: office.lastVerifiedAt,
        verificationLevel: office.verificationLevel,
        sourceTitle: sources.get(office.sourceId)?.title ?? "",
        sourceUrl: sources.get(office.sourceId)?.url ?? "",
        contactType: officeContactType(office, municipality?.representativePhone),
        transferTarget: transferTarget(office.categoryId),
      };
    });

  return NextResponse.json(
    { programs, offices },
    {
      headers: {
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    },
  );
}
