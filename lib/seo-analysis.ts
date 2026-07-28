import type { PortalData } from "@/lib/data/repository";
import type { Municipality, Office } from "@/lib/data/schemas";
import { isIndexableSupportPage } from "@/lib/seo-indexing";
import { officeContactType, selectOffices } from "@/lib/support-routing";

export type OfficeIndex = {
  local: Map<string, Office[]>;
  prefecture: Map<string, Office[]>;
  national: Office[];
};

export function buildOfficeIndex(offices: Office[]): OfficeIndex {
  const local = new Map<string, Office[]>();
  const prefecture = new Map<string, Office[]>();
  const national = offices.filter((office) => office.scope === "national");
  for (const office of offices) {
    const map =
      office.scope === "municipality" ? local : office.scope === "prefecture" ? prefecture : null;
    const key = office.scope === "municipality" ? office.municipalityId : office.prefectureCode;
    if (!map || !key) continue;
    map.set(key, [...(map.get(key) ?? []), office]);
  }
  return { local, prefecture, national };
}

export function selectedOfficesFor(
  index: OfficeIndex,
  municipality: Municipality,
  categoryId: string,
): Office[] {
  return selectOffices(
    [
      ...(index.local.get(municipality.id) ?? []),
      ...(index.prefecture.get(municipality.prefectureCode) ?? []),
      ...index.national,
    ],
    municipality.id,
    categoryId,
    municipality.representativePhone,
    municipality.prefectureCode,
  );
}

export function indexableMunicipalitiesFor(
  data: PortalData,
  index: OfficeIndex,
  prefectureCode: string,
  categoryId: string,
): Municipality[] {
  return data.municipalities.filter((municipality) => {
    if (municipality.prefectureCode !== prefectureCode) return false;
    const selected = selectedOfficesFor(index, municipality, categoryId);
    return isIndexableSupportPage(selected, municipality.id, categoryId);
  });
}

export function hasOnlyRepresentativeLocalValue(
  index: OfficeIndex,
  municipality: Municipality,
  categoryId: string,
): boolean {
  const local = (index.local.get(municipality.id) ?? []).filter(
    (office) => office.categoryId === categoryId || office.categoryId === "unknown",
  );
  return (
    local.some(
      (office) => officeContactType(office, municipality.representativePhone) === "representative",
    ) &&
    !local.some(
      (office) =>
        office.categoryId === categoryId &&
        officeContactType(office, municipality.representativePhone) !== "representative",
    )
  );
}
