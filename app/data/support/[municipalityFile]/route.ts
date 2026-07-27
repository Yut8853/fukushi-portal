import { NextResponse } from "next/server";
import { getPublicPortalData } from "@/lib/data/repository";
import type { FinderOffice, FinderProgram } from "@/lib/data/view-models";
import { officeContactType, transferTarget } from "@/lib/support-routing";

export const dynamicParams = false;
export const revalidate = 86_400;

type RouteProps = {
  params: Promise<{ municipalityFile: string }>;
};

export async function generateStaticParams() {
  const data = await getPublicPortalData();
  return [
    { municipalityFile: "national.json" },
    ...data.municipalities.map((item) => ({ municipalityFile: `${item.id}.json` })),
  ];
}

export async function GET(_request: Request, { params }: RouteProps) {
  const { municipalityFile } = await params;
  const municipalityId = municipalityFile.replace(/\.json$/, "");
  const data = await getPublicPortalData();
  const municipality =
    municipalityId === "national"
      ? undefined
      : data.municipalities.find((item) => item.id === municipalityId);

  if (municipalityId !== "national" && !municipality) {
    return NextResponse.json({ error: "自治体が見つかりません。" }, { status: 404 });
  }

  const sources = new Map(data.sources.map((source) => [source.id, source]));
  const programs: FinderProgram[] = data.programs
    .filter(
      (item) =>
        item.scope === "national" ||
        Boolean(municipality && item.municipalityId === municipality.id),
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
    .filter((office) => Boolean(municipality && office.municipalityId === municipality.id))
    .map((office) => ({
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
    }));

  return NextResponse.json(
    { programs, offices },
    {
      headers: {
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    },
  );
}
