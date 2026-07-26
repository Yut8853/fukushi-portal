import type { PortalData } from "./repository";

export type FinderMunicipality = {
  id: string;
  prefectureCode: string;
  name: string;
  officialUrl: string;
  supportLevel: "basic" | "standard" | "detailed";
};

export type FinderProgram = {
  id: string;
  categoryId: string;
  scope: "national" | "prefecture" | "municipality" | "private";
  municipalityId: string;
  name: string;
  plainName: string;
  description: string;
  applicationFlow: string;
  requiredDocuments: string[];
  documentsOptionalNote: string;
  sourceTitle: string;
  sourceUrl: string;
  lastVerifiedAt: string;
};

export type FinderOffice = {
  id: string;
  municipalityId: string;
  categoryId: string;
  name: string;
  plainName: string;
  description: string;
  phone: string;
  officialUrl: string;
  openingHours: string;
  closedDays: string;
  address: string;
  lastVerifiedAt: string;
  sourceTitle: string;
  sourceUrl: string;
};

export type FinderViewModel = {
  prefectures: { code: string; name: string }[];
  categories: { id: string; label: string; description: string }[];
  municipalities: FinderMunicipality[];
  programs: FinderProgram[];
  offices: FinderOffice[];
};

export function toFinderViewModel(data: PortalData): FinderViewModel {
  const sources = new Map(data.sources.map((source) => [source.id, source]));
  return {
    prefectures: data.prefectures.map(({ code, name }) => ({ code, name })),
    categories: [...data.categories]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(({ id, label, description }) => ({ id, label, description })),
    municipalities: data.municipalities.map(({ id, prefectureCode, name, officialUrl, supportLevel }) => ({
      id, prefectureCode, name, officialUrl, supportLevel,
    })),
    programs: data.programs.map((program) => ({
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
    })),
    offices: data.offices.map((office) => ({
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
      address: office.address,
      lastVerifiedAt: office.lastVerifiedAt,
      sourceTitle: sources.get(office.sourceId)?.title ?? "",
      sourceUrl: sources.get(office.sourceId)?.url ?? "",
    })),
  };
}

export type AdminMunicipality = {
  id: string;
  prefectureCode: string;
  prefectureName: string;
  name: string;
  supportLevel: "basic" | "standard" | "detailed";
  status: string;
  officeCount: number;
  programCount: number;
  lastVerifiedAt: string;
  missingCount: number;
  verificationExpired: boolean;
};

export function toAdminMunicipalities(data: PortalData): AdminMunicipality[] {
  const prefectureNames = new Map(data.prefectures.map((item) => [item.code, item.name]));
  return data.municipalities.map((municipality) => {
    const offices = data.offices.filter((item) => item.municipalityId === municipality.id);
    const directPrograms = data.programs.filter((item) => item.municipalityId === municipality.id);
    const linkedPrograms = data.municipalityPrograms.filter((item) => item.municipalityId === municipality.id);
    const missing = [
      !municipality.nameKana,
      !municipality.officialUrl,
      !municipality.representativePhone,
      !municipality.lastVerifiedAt,
      ...offices.flatMap((office) => [!office.sourceId, !office.lastVerifiedAt, !office.phone && !office.officialUrl && !office.contactFormUrl && !office.email]),
    ].filter(Boolean).length;
    const lastVerified = municipality.lastVerifiedAt
      ? new Date(`${municipality.lastVerifiedAt}T00:00:00Z`).getTime()
      : 0;
    return {
      id: municipality.id,
      prefectureCode: municipality.prefectureCode,
      prefectureName: prefectureNames.get(municipality.prefectureCode) ?? municipality.prefectureCode,
      name: municipality.name,
      supportLevel: municipality.supportLevel,
      status: municipality.status,
      officeCount: offices.length,
      programCount: directPrograms.length + linkedPrograms.length,
      lastVerifiedAt: municipality.lastVerifiedAt,
      missingCount: missing,
      verificationExpired: !lastVerified || Date.now() - lastVerified > 365 * 86_400_000,
    };
  });
}
