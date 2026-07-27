import { NextRequest, NextResponse } from "next/server";
import { getPublicPortalData } from "@/lib/data/repository";
import type { FinderOffice, FinderProgram } from "@/lib/data/view-models";
import { officeContactType, selectOffices, transferTarget } from "@/lib/support-routing";

export async function GET(request: NextRequest) {
  const categoryId = request.nextUrl.searchParams.get("need") ?? "";
  const municipalityId = request.nextUrl.searchParams.get("municipality") ?? "";
  const data = await getPublicPortalData();
  if (!data.categories.some((item) => item.id === categoryId)) {
    return NextResponse.json({ error: "困りごとを選んでください。" }, { status: 400 });
  }
  if (municipalityId && !data.municipalities.some((item) => item.id === municipalityId)) {
    return NextResponse.json({ error: "自治体が見つかりません。" }, { status: 404 });
  }
  const sources = new Map(data.sources.map((source) => [source.id, source]));
  const available = data.programs.filter((item) =>
    item.scope === "national" || Boolean(municipalityId && item.municipalityId === municipalityId));
  const directPrograms = available.filter((item) => item.categoryId === categoryId);
  const selectedPrograms = directPrograms.length
    ? directPrograms
    : available.filter((item) => ["public-assistance", "self-reliance"].includes(item.id));
  const selectedOffices = selectOffices(data.offices, municipalityId, categoryId);

  const programs: FinderProgram[] = selectedPrograms.map((program) => ({
    id: program.id, categoryId: program.categoryId, scope: program.scope,
    municipalityId: program.municipalityId, name: program.name, plainName: program.plainName,
    description: program.description, applicationFlow: program.applicationFlow,
    requiredDocuments: program.requiredDocuments.split("・").filter(Boolean),
    documentsOptionalNote: program.documentsOptionalNote,
    sourceTitle: sources.get(program.sourceId)?.title ?? "",
    sourceUrl: sources.get(program.sourceId)?.url ?? "",
    lastVerifiedAt: program.lastVerifiedAt,
  }));
  const offices: FinderOffice[] = selectedOffices.map((office) => ({
    id: office.id, municipalityId: office.municipalityId, categoryId: office.categoryId,
    name: office.name, plainName: office.plainName, description: office.description,
    phone: office.phone, officialUrl: office.officialUrl, openingHours: office.openingHours,
    closedDays: office.closedDays, availableMethods: office.availableMethods,
    address: office.address, serviceArea: office.serviceArea,
    eligibilityConditions: office.eligibilityConditions, lastVerifiedAt: office.lastVerifiedAt,
    sourceTitle: sources.get(office.sourceId)?.title ?? "",
    sourceUrl: sources.get(office.sourceId)?.url ?? "",
    contactType: officeContactType(office),
    transferTarget: transferTarget(categoryId),
  }));
  return NextResponse.json({ programs, offices }, {
    headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=86400" },
  });
}
