import type { PortalData } from "./repository";
import { isVerificationExpired, municipalityMissingCount } from "./quality";

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
  serviceArea: string;
  eligibilityConditions: string;
  lastVerifiedAt: string;
  sourceTitle: string;
  sourceUrl: string;
};

export type FinderViewModel = {
  prefectures: { code: string; name: string }[];
  categories: { id: string; label: string; description: string }[];
  municipalities: FinderMunicipality[];
  latestVerifiedAt: string;
};

export function toFinderViewModel(data: PortalData): FinderViewModel {
  return {
    prefectures: data.prefectures.map(({ code, name }) => ({ code, name })),
    categories: [...data.categories]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(({ id, label, description }) => ({ id, label, description })),
    municipalities: data.municipalities.map(({ id, prefectureCode, name, officialUrl, supportLevel }) => ({
      id, prefectureCode, name, officialUrl, supportLevel,
    })),
    latestVerifiedAt: [
      ...data.municipalities, ...data.offices, ...data.programs, ...data.sources,
    ].map((item) => item.lastVerifiedAt).filter(Boolean).sort().at(-1) ?? "",
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
      missingCount: municipalityMissingCount(municipality, offices),
      verificationExpired: isVerificationExpired(municipality.lastVerifiedAt),
    };
  });
}
